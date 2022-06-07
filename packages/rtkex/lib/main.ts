import {
  AnyAction,
  createSlice as createSliceOriginal,
  configureStore as configureStoreOriginal,
  CreateSliceOptions,
  Middleware,
  Reducer,
  Slice,
  SliceCaseReducers,
  Store,
  StoreEnhancer,
  combineReducers,
  createAsyncThunk,
  AsyncThunkPayloadCreator,
  AsyncThunkOptions,
  Dispatch,
  createAction,
  original,
} from "@reduxjs/toolkit";
import { useState } from "react";
import { EqualityFn, useSelector as selectorHook, useStore } from "react-redux";

export * from "@reduxjs/toolkit";

export type Selector<TName extends string, TState, TSelected = TState> = (
  state: SelectorState<TName, TState>
) => TSelected;

export interface WrappedSlice<TName, TState, TActions, TSelector> {
  name: TName;
  getInitialState(): TState | undefined;
  actions: TActions;
  selector: TSelector;
  reducer: Reducer<TState>;
}

export interface EnhancedSlice<
  TState = any,
  TCaseReducers extends SliceCaseReducers<TState> = SliceCaseReducers<TState>,
  TName extends string = string
> extends Slice<TState, TCaseReducers, TName> {
  dependencies?: SliceInfo[];

  /**
   * a selector that returns state of slice from root state
   * @param state
   */
  selector: Selector<TName, TState>;

  /**
   * wrap the reducer of the slice with high order reducer
   * @param highOrderReducer
   * @param initialState
   */
  wrap<S>(
    highOrderReducer: (reducer: Reducer<TState>) => Reducer<S>,
    initialState?: S
  ): WrappedSlice<
    TName,
    S,
    Slice<TState, TCaseReducers, TName>["actions"],
    Selector<TName, S>
  >;
}

export type ClonableEnhancedSlice<
  TState = any,
  TCaseReducers extends SliceCaseReducers<TState> = SliceCaseReducers<TState>,
  TName extends string = string
> = EnhancedSlice<TState, TCaseReducers, TName> & {
  /**
   * make a copy of current slice but with new name
   * @param newName
   * @returns
   */
  clone<TNewName extends string>(
    newName: TNewName
  ): ClonableEnhancedSlice<TState, TCaseReducers, TNewName>;
};

export type Combiner<TSelectors, TResult> = (values: {
  [key in keyof TSelectors]: TSelectors[key] extends EnhancedSlice
    ? ReturnType<TSelectors[key]["selector"]>
    : TSelectors[key] extends (state: any) => infer T
    ? T
    : never;
}) => TResult;

export type UseSelector = {
  /**
   * A hook to access the redux store's state. This hook takes a selector function
   * as an argument. The selector is called with the store state.
   *
   * This hook takes an optional equality comparison function as the second parameter
   * that allows you to customize the way the selected state is compared to determine
   * whether the component needs to be re-rendered.
   *
   * @param {Function} selector the selector function
   * @param {Function=} equalityFn the function that will be used to determine equality
   *
   * @returns {any} the selected state
   *
   * @example
   *
   * import React from 'react'
   * import { useSelector } from 'rtkex'
   *
   * export const CounterComponent = () => {
   *   const counter = useSelector(state => state.counter)
   *   return <div>{counter}</div>
   * }
   */
  <TState = unknown, TSelected = unknown>(
    selector: (state: TState) => TSelected,
    equalityFn?: EqualityFn<TSelected> | undefined
  ): TSelected;

  /**
   * A hook to access the redux store's state. This hook takes a selectors and combiner function
   * as an arguments. The selector will be created by passing selectors and combiner to combineSelectors.
   */
  <TSelectors, TSelected>(
    selectors: TSelectors,
    combiner: Combiner<TSelectors, TSelected>,
    equalityFn?: EqualityFn<TSelected> | undefined
  ): TSelected;

  <TSelected>(
    slide: EnhancedSlice<TSelected>,
    equalityFn?: EqualityFn<TSelected> | undefined
  ): TSelected;
};

/**
 * combine multiple selectors/slice selectors into one selector
 * @param selectors
 * @param combiner
 * @returns
 */
export const combineSelectors = <TSelectors, TResult>(
  selectors: TSelectors,
  combiner: Combiner<TSelectors, TResult>
) => {
  const entries = Object.entries(selectors);
  return (state: any): TResult => {
    const selected: any = {};
    entries.forEach(([key, selector]) => {
      selected[key] =
        typeof selector === "function"
          ? selector(state)
          : selector.selector(state);
    });
    return combiner(selected);
  };
};

const createSelector =
  (originalSelector: (state: any) => any) => (input: any) => {
    if (typeof input === "function") {
      return (state: any) => input(originalSelector(state));
    }
    return originalSelector(input);
  };

/**
 * create a slice that includes enhanced props
 * @param name
 * @param initialState
 * @param options
 * @returns
 */
export const createSlice = <
  TState,
  TCaseReducers extends SliceCaseReducers<TState>,
  TName extends string = string
>(
  name: TName,
  initialState: TState,
  reducers: CreateSliceOptions<TState, TCaseReducers, TName>["reducers"],
  options?: Omit<
    CreateSliceOptions<TState, TCaseReducers, TName>,
    "name" | "initialState" | "reducers"
  > & { dependencies?: Slice[] }
): ClonableEnhancedSlice<TState, TCaseReducers, TName> => {
  const slice = createSliceOriginal({
    ...options,
    name,
    initialState,
    reducers,
  });

  const selector = createSelector((state) => state[slice.name]);

  return {
    ...slice,
    selector,
    wrap(highOrderReducer, initialState) {
      return {
        name: slice.name,
        actions: slice.actions,
        selector,
        getInitialState: () => initialState,
        reducer: highOrderReducer(this.reducer),
      };
    },
    dependencies: options?.dependencies ?? [],
    clone<TNewName extends string>(newName: TNewName) {
      return createSlice(newName, initialState, reducers, options);
    },
  };
};

export const useSelector: UseSelector = (...args: any[]) => {
  if (typeof args[0] === "function") {
    return selectorHook(args[0], args[1]);
  }
  if (
    args[0].name &&
    args[0].reducer &&
    typeof args[0].selector === "function"
  ) {
    return selectorHook(args[0].selector, args[1]);
  }
  return selectorHook(combineSelectors(args[0], args[1]), args[2]);
};

export type DynamicBuildCallback = (
  builder: Pick<StoreBuilder, "addSlice" | "addReducer">
) => void;

export interface Injector extends Function {
  (builder: StoreBuilder): void;
  inject(buildCallback: DynamicBuildCallback): void;
}

export interface SliceInfo<
  TName extends string = string,
  TState = any,
  TActions = {}
> {
  name: TName;
  reducer: Reducer<TState>;
  actions: TActions;
  dependencies?: SliceInfo[];
}

export interface StoreBuilder<
  TState = any,
  TAction extends AnyAction = AnyAction
> {
  addSlice<S = any, N extends string = string, A = any>(
    slice: SliceInfo<N, S, A>
  ): StoreBuilder<TState & { [key in N]: S }, TAction | { type: string }>;

  addMiddleware(...middleware: Middleware[]): this;

  addReducer<S, A extends AnyAction>(
    reducer: Reducer<S, A>
  ): StoreBuilder<TState & S, TAction | A>;

  setPreloadedState<S>(state: S): StoreBuilder<TState & S, TAction>;

  enableDevTools(enabled: boolean): this;

  enableDevTools(options: {}): this;

  addEnhancers(...enhancers: StoreEnhancer[]): this;
}

export type BuildCallback<
  TState = any,
  TAction extends AnyAction = AnyAction
> = (builder: StoreBuilder<{}, never>) => StoreBuilder<TState, TAction>;

interface InternalStoreBuilder<
  TState = any,
  TAction extends AnyAction = AnyAction
> extends StoreBuilder<TState, TAction> {
  build(buildCallback: (builder: this) => any, force?: boolean): void;
}

const createStoreBuilder = (
  onBuild: (data: {
    token: any;
    enhancers: StoreEnhancer[];
    middleware: Middleware[];
    reducers: Reducer[];
    reducerMap: Record<string, Reducer>;
    preloadedState: any;
    devTools: any;
  }) => void
): InternalStoreBuilder<any, any> => {
  let token = {};
  let reducerMap: Record<string, Reducer> = {};
  let reducers: Reducer[] = [];
  let middleware: Middleware[] = [];
  let enhancers: StoreEnhancer[] = [];
  let devTools: any;
  let preloadedState: any = {};
  let prevToken = token;

  const addSlice = (inputSlice: SliceInfo) => {
    if (reducerMap[inputSlice.name] !== inputSlice.reducer) {
      reducerMap = { ...reducerMap, [inputSlice.name]: inputSlice.reducer };
      token = {};
      if (inputSlice.dependencies?.length) {
        inputSlice.dependencies.forEach(addSlice);
      }
    }
  };

  return {
    build(buildCallback, force) {
      prevToken = token;
      buildCallback(this);
      if (!force && prevToken === token) return;
      prevToken = token;

      onBuild({
        token,
        reducerMap,
        reducers,
        middleware,
        enhancers,
        preloadedState,
        devTools,
      });

      return;
    },
    addMiddleware(...inputMiddleware) {
      const newMiddleware = inputMiddleware.filter(
        (x) => !middleware.includes(x)
      );
      if (newMiddleware.length) {
        middleware = middleware.concat(newMiddleware);
        token = {};
      }
      return this;
    },
    addEnhancers(...input) {
      const newEnhancers = input.filter((x) => !enhancers.includes(x));
      if (newEnhancers.length) {
        enhancers = enhancers.concat(newEnhancers);
        token = {};
      }
      return this;
    },
    addSlice(inputSlice) {
      addSlice(inputSlice);
      return this;
    },
    addReducer(inputReducer: any) {
      if (!reducers.includes(inputReducer)) {
        reducers = reducers.concat(inputReducer);
        token = {};
      }
      return this;
    },
    enableDevTools(input: any) {
      devTools = input;
      return this;
    },
    setPreloadedState(state) {
      if (preloadedState !== state) {
        preloadedState = state;
        token = {};
      }
      return this;
    },
  };
};

/**
 * A hook that can access store builder of current store. Use store builder for adding reducers or slides dynamically
 * @param buildCallbacks
 */
export const useBuilder = (...buildCallbacks: DynamicBuildCallback[]) => {
  const store = useStore();

  useState(() => {
    const builder = (store as any).builder as InternalStoreBuilder;
    if (!builder) throw new Error("The current store does not support builder");
    builder.build(() => buildCallbacks.forEach((x) => x(builder)));
  });
};

export const configureStore = <TState, TAction extends AnyAction>(
  buildCallback?: BuildCallback<TState, TAction>
): Store<TState, TAction> => {
  let store: Store<TState, TAction> | undefined;

  const builder = createStoreBuilder(
    ({
      preloadedState,
      reducerMap,
      reducers,
      middleware,
      enhancers,
      devTools,
    }) => {
      if (Object.keys(reducerMap).length) {
        reducers.push(combineReducers(reducerMap));
      }
      const reducer = (state: TState | undefined, action: TAction) => {
        for (const r of reducers) {
          state = r(state, action);
        }
        return state as TState;
      };
      if (store) {
        store.replaceReducer(reducer);
      } else {
        store = configureStoreOriginal({
          preloadedState,
          reducer,
          devTools,
          enhancers,
          middleware: (getDefaultMiddleware) => [
            ...getDefaultMiddleware(),
            ...middleware,
          ],
        });
      }
    }
  );

  builder.build(buildCallback ?? ((builder) => builder), true);

  if (store) {
    Object.assign(store, { builder });
  }

  return store as Store<TState, TAction>;
};

export type AsyncThunkConfig = {
  state?: unknown;
  dispatch?: Dispatch;
  extra?: unknown;
  rejectValue?: unknown;
  serializedErrorType?: unknown;
  pendingMeta?: unknown;
  fulfilledMeta?: unknown;
  rejectedMeta?: unknown;
};

export type SelectorState<TName extends string, TState> = {
  [key in TName]: TState;
};

export type LoadableSlice<TName extends string, TState, TArg> = EnhancedSlice<
  Loadable<TState>,
  {},
  TName
> & {
  dataSelector: Selector<TName, Loadable<TState>, TState>;
  actions: {
    cancel(): AnyAction;
    load(payload: TArg): AnyAction;
    loaded(): AnyAction;
    failed(): AnyAction;
    loading(): AnyAction;
  };
};

export type LoadableSliceOptions<TState, TThunkArg, ThunkApiConfig> =
  AsyncThunkOptions<TThunkArg, ThunkApiConfig> & {
    initialState?: TState;
  };

export type CreateLoadableSlice = {
  <TName extends string, TState, TThunkArg = void>(
    name: TName,
    payloadCreator: AsyncThunkPayloadCreator<
      TState | Promise<TState>,
      TThunkArg,
      {}
    >,
    options?: LoadableSliceOptions<TState, TThunkArg, {}>
  ): LoadableSlice<TName, TState, TThunkArg>;
  <
    TName extends string,
    TState,
    TThunkArg,
    ThunkApiConfig extends AsyncThunkConfig
  >(
    name: TName,
    payloadCreator: AsyncThunkPayloadCreator<
      TState | Promise<TState>,
      TThunkArg,
      ThunkApiConfig
    >,
    options?: LoadableSliceOptions<TState, TThunkArg, ThunkApiConfig>
  ): LoadableSlice<TName, TState, TThunkArg>;
};

export interface Loadable<T = any> {
  isLoading: boolean;
  isIdle: boolean;
  isLoaded: boolean;
  isFailed: boolean;
  status: "idle" | "loading" | "failed" | "loaded";
  data: T;
  error?: any;
}

interface InternalLoadable<T = any> extends Loadable<T> {
  token?: any;
}

const createLoadable = <T = any>(
  status: Loadable<T>["status"],
  data: T,
  error?: any
): InternalLoadable<T> => {
  return {
    data,
    error,
    status,
    isLoaded: status === "loaded",
    isFailed: status === "failed",
    isIdle: status === "idle",
    isLoading: status === "loading",
  };
};

const defaultLoadableState = createLoadable<any>("idle", undefined);

const createDefer = <T = any>() => {
  let resolve: any;
  let reject: any;
  const promise = new Promise<T>((...args) => {
    [resolve, reject] = args;
  });
  promise.catch(() => {});
  return Object.assign(promise, {
    resolve: resolve as (value?: T) => any,
    reject: reject as (value?: any) => any,
  });
};

export const createLoadableSlice: CreateLoadableSlice = (
  name: string,
  payloadCreator: any,
  options: any = {}
): any => {
  let lastAbort: Function | undefined;
  // the token must be symbol because immer will wrap all object values so we cannot use strict compare (state.token === token)
  let token: any = {};
  const defers = new WeakMap<any, ReturnType<typeof createDefer>>();
  const initialLoadable =
    typeof options.initialState !== "undefined"
      ? { ...createLoadable("loaded", options.initialState), token }
      : defaultLoadableState;

  const thunk = createAsyncThunk(
    `${name}/load`,
    (...args) => {
      const result = payloadCreator(...args);
      lastAbort = result?.abort;
      return result;
    },
    options
  );

  const cancel = createAction(`${name}/cancel`, () => {
    lastAbort?.();
    return { payload: undefined };
  });
  const slice = createSlice(
    name,
    initialLoadable,
    {},
    {
      extraReducers: (builder) =>
        builder
          .addCase(thunk.pending, (state) => {
            token = {};
            defers.set(token, createDefer());
            return {
              ...createLoadable("loading", state.data),
              token,
            };
          })
          .addCase(thunk.fulfilled, (state, action) => {
            const originalToken = original(state.token);
            if (originalToken !== token) return state;
            const defer = defers.get(originalToken);
            if (defer) {
              defer.resolve(action.payload);
              defers.delete(originalToken);
            }
            return { ...createLoadable("loaded", action.payload), token };
          })
          .addCase(thunk.rejected, (state, action) => {
            const originalToken = original(state.token);
            if (originalToken !== token) return state;
            const defer = defers.get(originalToken);
            if (defer) {
              defer.reject(action.error);
              defers.delete(originalToken);
            }
            return {
              ...createLoadable("failed", state.data, action.error),
              token,
            };
          })
          .addCase(cancel, (state) => {
            const originalToken = original(state.token);
            if (!state.isLoading || originalToken !== token) return state;
            const defer = defers.get(originalToken);
            if (defer) defers.delete(originalToken);
            return createLoadable(
              state.isLoaded ? "loaded" : "idle",
              state.data
            );
          }),
    }
  );

  const handleSuspenseErrorBoundary = (loadable: InternalLoadable) => {
    if (loadable.isFailed) throw loadable.error;
    if (loadable.isLoading) {
      const defer = defers.get(loadable.token);
      if (defer) throw defer;
      return;
    }
  };

  return Object.assign(slice, {
    dataSelector: createSelector((state: any) => {
      const loadable = slice.selector(state);
      handleSuspenseErrorBoundary(loadable);
      return loadable.data;
    }),
    actions: {
      load: thunk,
      loading: thunk.pending,
      loaded: thunk.fulfilled,
      failed: thunk.rejected,
      cancel,
    },
  });
};
