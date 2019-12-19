// tslint:disable

import { expect } from 'chai';
import Machine from '../index';

describe('test state machine', () => {

  // TODO: state names should be minifiable.
  // TODO add machine.defineNode .defineTransition etc etc
  //      and machine.useNode useTransition etc etc
  // TODO: ability to use an ...args as StateBuilders[] 
    // for .children .describe
    // for .child 

  // TODO: when using a referance as target, we need to automaticly
  // append "#" or "." ie: .target when it's a child states
  // should implement ".closest()" method to generate the target id.

  it('should able to add children using .children', () => {
    const machineConfig = Machine.Builder((machine) => {
      const parentNode = machine.atomic('test-node');
      const childNode1 = machine.atomic('test-node-2');
      const childNode2 = machine.atomic('test-node-3');
      
      parentNode.children([childNode1, childNode2])
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      "initial": "test-node",
      "states": {
        "test-node": {
          "type": "compound",
          "states": {
            "test-node-2": {
              "type": "atomic"
            },
            "test-node-3": {
              "type": "atomic"
            }
          }
        }
      }
    });
  })

  it('should able to add history target', () => {
    const machineConfig = Machine.Builder((machine) => {
      const testNode = machine.state('test');
      machine.history('hist').deep().target(testNode);
    });

    const machineConfig2 = Machine.Builder((machine) => {
      const testNode = machine.state('test');
      machine.history('hist')
        .target(testNode)
        .deep();
    });

    const machineConfig3 = Machine.Builder((machine) => {
      const testNode = machine.state('test');
      machine.history('hist', { history: 'deep' })
        .target(testNode)
    });

    const machineConfig4 = Machine.Builder((machine) => {
      const testNode = machine.state('test');
      machine.history('hist', { deep: true })
        .target(testNode)
    });

    expect(machineConfig4.getConfig()).to.deep.equal(machineConfig.getConfig());
    expect(machineConfig3.getConfig()).to.deep.equal(machineConfig.getConfig());
    expect(machineConfig2.getConfig()).to.deep.equal(machineConfig.getConfig());
    expect(machineConfig.getConfig()).to.deep.equal({
      "initial": "test",
      "states": {
        "test": {
          "type": "atomic"
        },
        "hist": {
          "type": "history",
          "history": "deep",
          "target": "test"
        }
      }
    });
  })

  it('should have ability to add already defined node to child states', () => {
    const machineConfig = Machine.Builder((machine) => {
      const parentNode = machine.atomic('test-node');
      const childNode = machine.atomic('test-node-child');

      parentNode.addChildState(childNode);
      
      // can event change state after and still works
      childNode.on('CLICK').do('DO')

      // can still add child using children builder
      parentNode.children((child) => {
        const childParent = child.atomic('2nd-child');
        const other = child.atomic('2nd-child-child');
        childParent.addChildState(other);
      })
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      "initial": "test-node",
      "states": {
        "test-node": {
          "type": "compound",
          "states": {
            "test-node-child": {
              "type": "atomic",
              "on": {
                "CLICK": {
                  "actions": "DO"
                }
              }
            },
            "2nd-child": {
              "type": "compound",
              "states": {
                "2nd-child-child": {
                  "type": "atomic"
                }
              }
            }
          }
        }
      }
    })
  })

  it('should use directly a xstate configuration object', () => {
    const machineConfig = Machine.Builder((machine) => {
      machine.atomic('test-node')
        .assignConfig({
          "on": {
            "": {
                "cond": "GUARD1",
                "action": "ACTION"
            },
          }
        })
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      "initial": "test-node",
      "states": {
        "test-node": {
          "type": "atomic",
          "on": {
            "": {
              "cond": "GUARD1",
              "action": "ACTION"
            }
          }
        }
      }
    });
  });

  it('should be able to create a transiant state', () => {
    const machineConfig = Machine.Builder((state) => {
      state.switch('transiant-example')
        .case('GUARD1').target('TARGET1')
        .case('GUARD1').target('TARGET2')
        .default('TARGET3');
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      "initial": "transiant-example",
      "states": {
        "transiant-example": {
          "type": "atomic",
          "on": {
            "": [
              {
                "cond": "GUARD1",
                "target": "TARGET1"
              },
              {
                "cond": "GUARD1",
                "target": "TARGET2"
              },
              {
                "target": "TARGET3"
              }
            ]
          }
        }
      }
    })
  })
  it('should let define machine context', () => {
    const machineConfig = Machine.Builder((state) => {
      state.context({ test: true });
    });

    const machineConfigUsingFunction = Machine.Builder((state) => {
      state.context(() => ({ test: true }));
    });

    expect(machineConfig.getConfig()).to.deep.equal(machineConfigUsingFunction.getConfig());
    expect(machineConfig.getConfig()).to.deep.equal({
      'context': {
        'test': true,
      },
    });
  });

  it('should work with array methods', () => {
    const machineConfig = Machine.Builder((state) => {
      const node1 = state.atomic('node-1');
      const node2 = state.atomic('node-2');
      const node3 = state.atomic('node-3');

      [node1, node2, node3].forEach((state, index, nodes) => {
        state.on('NEXT').target(nodes[index + 1] || nodes[0]);
      });
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      'initial': 'node-1',
      'states': {
        'node-1': {
          'type': 'atomic',
          'on': {
            'NEXT': 'node-2',
          },
        },
        'node-2': {
          'type': 'atomic',
          'on': {
            'NEXT': 'node-3',
          },
        },
        'node-3': {
          'type': 'atomic',
          'on': {
            'NEXT': 'node-1',
          },
        },
      },
    });
  });

  it('should be able to add child state nodes', () => {
    const machineConfig = Machine.Builder((state) => {
      state.compound('atomic-node')
        .describe((child) => {
          child.atomic('CHILD_1').on('SOME_EVENT', 'TARGET_X');
          child.atomic('CHILD_2').on('ANOTHER_EVENT', 'TARGET_X');
        });
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'compound',
          'states': {
            'CHILD_1': {
              'type': 'atomic',
              'on': {
                'SOME_EVENT': 'TARGET_X',
              },
            },
            'CHILD_2': {
              'type': 'atomic',
              'on': {
                'ANOTHER_EVENT': 'TARGET_X',
              },
            },
          },
        },
      },
    });
  });

  it('should be able to chain several cond operations', () => {
    const machineConfig = Machine.Builder((state) => {
      state.atomic('atomic-node')
        .on('MOUSE_DOWN')
          .cond('GUARD').action('ACTION')
          .cond('GUARD2').action('ACTION2');
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'atomic',
          'on': {
            'MOUSE_DOWN': [
              { 'cond': 'GUARD', 'actions': 'ACTION', },
              { 'cond': 'GUARD2', 'actions': 'ACTION2', },
            ],
          },
        },
      },
    });
  });

  it('should access parent prototype builder if not in current builder', () => {
    const machineConfig = Machine.Builder((state) => {
      state.atomic('atomic-node')
        .on('MOUSE_DOWN').cond('GUARD').action('ACTION')
        .on('MOUSE_UP').cond('GUARD').action('ACTION');
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'atomic',
          'on': {
            'MOUSE_DOWN': {
              'cond': 'GUARD',
              'actions': 'ACTION',
            },
            'MOUSE_UP': {
              'cond': 'GUARD',
              'actions': 'ACTION',
            },
          },
        },
      },
    });
  });

  it('should let use this keyword with anonymous functions', () => {
    const machineConfig = Machine.Builder((state) => {
      state.atomic('atomic-node', function () {
        this.on('CLICK').target('SOMETHING');
      });
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'atomic',
          'on': {
            'CLICK': 'SOMETHING',
          },
        },
      },
    });
  });

  it('should let use state reference as target', () => {
    const machineConfig = Machine.Builder((state) => {
      const node1 = state.atomic('atomic-node');
      const node2 = state.atomic('atomic-node-2');
      node1.on('CLICK').target(node2);
      node2.on('CLICK').target(node1);
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'atomic',
          'on': {
            'CLICK': 'atomic-node-2',
          },
        },
        'atomic-node-2': {
          'type': 'atomic',
          'on': {
            'CLICK': 'atomic-node',
          },
        },
      },
    });
  });
});
