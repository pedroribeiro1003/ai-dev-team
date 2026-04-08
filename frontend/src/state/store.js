export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  function notify() {
    for (const listener of listeners) {
      listener(state);
    }
  }

  return {
    getState() {
      return state;
    },
    setState(nextState) {
      state =
        typeof nextState === "function"
          ? nextState(state)
          : {
              ...state,
              ...nextState,
            };
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
