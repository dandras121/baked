// A§1.5: while an animation (or the action it belongs to) runs, further presses on its trigger are ignored.
export type InputLock = {
  readonly locked: boolean;
  /** Runs `task` unless a task is already running; returns false when the press was ignored. */
  run(task: () => Promise<unknown> | unknown): boolean;
};

export function createInputLock(): InputLock {
  let locked = false;
  return {
    get locked() {
      return locked;
    },
    run(task) {
      if (locked) return false;
      locked = true;
      Promise.resolve()
        .then(task)
        .finally(() => {
          locked = false;
        });
      return true;
    },
  };
}
