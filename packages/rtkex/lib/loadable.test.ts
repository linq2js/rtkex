import { createLoadableSlice, configureStore } from "./main";
import { delay } from "./testUtils";
import { expect, test } from "vitest";

test("loaded", async () => {
  const slice = createLoadableSlice("slice", async () => 1, {
    reducers: {
      increment: (state) => state + 1,
    },
  });
  const store = configureStore((builder) => builder.withSlice(slice));
  expect(store.getState().slice.data).toBe(undefined);
  store.dispatch(slice.actions.load());
  expect(store.getState().slice.loading).toBeTruthy();
  await delay();
  expect(store.getState().slice.data).toBe(1);
  store.dispatch(slice.actions.increment());
  expect(store.getState().slice.data).toBe(2);
});

test("failed", async () => {
  const doSomethingWrong = () => {
    throw new Error("invalid");
  };
  const slice = createLoadableSlice("slice", async () => {
    doSomethingWrong();
    return 1;
  });
  const store = configureStore((builder) => builder.withSlice(slice));
  expect(store.getState().slice.data).toBe(undefined);
  store.dispatch(slice.actions.load());
  expect(store.getState().slice.loading).toBeTruthy();
  await delay();
  expect(store.getState().slice.error.message).toBe("invalid");
});
