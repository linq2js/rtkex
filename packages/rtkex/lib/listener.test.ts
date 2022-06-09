import { test, expect } from "vitest";
import { configureStore, createSlice } from "./main";

test("use action creator", async () => {
  let incrementDispatched = false;
  const slide = createSlice("slice", 0, { increment: (x) => x + 1 }).onBuild(
    (builder, slice) =>
      builder.withListener(slice.actions.increment, () => {
        incrementDispatched = true;
      })
  );
  const store = configureStore((x) => x.withSlice(slide));
  store.dispatch(slide.actions.increment());
  expect(incrementDispatched).toBeTruthy();
});
