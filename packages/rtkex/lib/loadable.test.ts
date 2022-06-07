import { createLoadableSlice, configureStore } from "./main";
import { expect, test } from "vitest";

const delay = (ms: number = 0) =>
  new Promise((resolve) => setTimeout(resolve, ms));

test("loaded", async () => {
  const slice = createLoadableSlice("slice", async () => 1);
  const store = configureStore((builder) => builder.addSlice(slice));
  expect(store.getState().slice.data).toBe(undefined);
  store.dispatch(slice.actions.load());
  expect(store.getState().slice.isLoading).toBeTruthy();
  await delay();
  expect(store.getState().slice.data).toBe(1);
});

test("failed", async () => {
  const doSomethingWrong = () => {
    throw new Error("invalid");
  };
  const slice = createLoadableSlice("slice", async () => {
    doSomethingWrong();
    return 1;
  });
  const store = configureStore((builder) => builder.addSlice(slice));
  expect(store.getState().slice.data).toBe(undefined);
  store.dispatch(slice.actions.load());
  expect(store.getState().slice.isLoading).toBeTruthy();
  await delay();
  expect(store.getState().slice.error.message).toBe("invalid");
});
