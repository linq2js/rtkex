import { expect, test } from "vitest";
import { configureStore, createSlice } from "./main";

test("should run onReadyHandler whenever slice added to the store", () => {
  const slice = createSlice("slice", 1, {
    increment: (state) => state + 1,
  }).onReady((store, context) => {
    store.dispatch(context.actions.increment());
  });
  const store = configureStore((builder) => builder.withSlice(slice));
  expect(store.getState().slice).toBe(2);
});
