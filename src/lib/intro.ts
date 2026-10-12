/**
 * The big entrance choreography plays once per visit. After that, switching tabs must feel instant,
 * so every later mount skips straight to its final state.
 */
export const intro = { played: false };
