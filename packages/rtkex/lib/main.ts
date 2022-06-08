import type {
  AnyAction,
  CreateSliceOptions,
  Middleware,
  Reducer,
  Slice,
  SliceCaseReducers,
  Store,
  StoreEnhancer,
  AsyncThunkPayloadCreator,
  AsyncThunkOptions,
  Dispatch,
  ValidateSliceCaseReducers,
  ActionReducerMapBuilder,
  CaseReducers,
  MiddlewareAPI,
} from "@reduxjs/toolkit";
import {
  createSlice as createSliceOriginal,
  configureStore as configureStoreOriginal,
  combineReducers,
  createAsyncThunk,
  createAction,
  original,
  isDraft,
} from "@reduxjs/toolkit";
import { NoInfer } from "@reduxjs/toolkit/dist/tsHelpers";
import { useState } from "react";
import { EqualityFn, useSelector as selectorHook, useStore } from "react-redux";

export * from "@reduxjs/toolkit";

export type Selector<TName extends string, TState, TSelected = TState> = (
  state: SelectorState<TName, TState>
) => TSelected;

export interface WrappedSlice<TName extends string, TState, TActions, TSelector>
  extends SliceBase<TName, TState, TActions> {
  selector: TSelector;
  reducer: Reducer<TState>;
}

export interface EnhancedSlice<
  TState = any,
  TCaseReducers extends SliceCaseReducers<TState> = SliceCaseReducers<TState>,
  TName extends string = string
> extends Slice<TState, TCaseReducers, TName> {
  dependencies?: SliceBase[];

  /**
   * a selector that returns state of slice from root state
   * @param state
   */
  select: Selector<TName, TState>;

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

  onReady: OnReady<this>;
}

export type ClonableSlice<
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
  ): ClonableSlice<TState, TCaseReducers, TNewName>;
};

export type Combiner<TSelectors, TResult> = (values: {
  [key in keyof TSelectors]: TSelectors[key] extends EnhancedSlice
    ? ReturnType<TSelectors[key]["select"]>
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

export type DynamicBuildCallback = (
  builder: Pick<StoreBuilder, "withSlice" | "withReducer">
) => void;

export interface SliceBase<
  TName extends string = string,
  TState = any,
  TActions = {}
> {
  name: TName;
  reducer: Reducer<TState>;
  actions: TActions;
  dependencies?: SliceBase[];
  getInitialState(): TState | undefined;
}

export interface StoreBuilder<
  TState = any,
  TAction extends AnyAction = AnyAction
> {
  /**
   * add slice to the store
   * @param slice
   */
  withSlice<S = any, N extends string = string, A = any>(
    slice: SliceBase<N, S, A>
  ): StoreBuilder<TState & { [key in N]: S }, TAction | { type: string }>;

  /**
   * add middleware to the store
   * @param middleware
   */
  withMiddleware(...middleware: Middleware[]): this;

  /**
   * add custom reducer to the store
   * @param reducer
   */
  withReducer<S, A extends AnyAction>(
    reducer: Reducer<S, A>
  ): StoreBuilder<TState & S, TAction | A>;

  /**
   *
   * @param state
   */
  withPreloadedState<S>(state: S): StoreBuilder<TState & S, TAction>;

  withDevTools(enabled: boolean): this;

  withDevTools(options: {}): this;

  withEnhancers(...enhancers: StoreEnhancer[]): this;
}

export type ReadyHandler<T = any> = (api: MiddlewareAPI, context: T) => void;

export type BuildCallback<
  TState = any,
  TAction extends AnyAction = AnyAction
> = (builder: StoreBuilder<{}, never>) => StoreBuilder<TState, TAction>;

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

export type LoadableSlice<
  TName extends string,
  TState,
  TArg,
  TCaseReducers extends SliceCaseReducers<TState>
> = EnhancedSlice<Loadable<TState>, {}, TName> & {
  selectData: Selector<TName, Loadable<TState>, TState>;
  actions: Slice<TState, TCaseReducers, TName>["actions"] & {
    cancel(): AnyAction;
    load(payload: TArg): AnyAction;
    loaded(): AnyAction;
    failed(): AnyAction;
    loading(): AnyAction;
    clearError(): AnyAction;
  };
};

export type LoadableLoader<
  TState,
  TArg = void,
  TApiConfig extends AsyncThunkConfig = {}
> = AsyncThunkPayloadCreator<TState, TArg, TApiConfig>;

export type LoadableOptions<
  TState = any,
  TThunkArg = void,
  ThunkApiConfig = any,
  TCaseReducers extends SliceCaseReducers<TState> = any
> = AsyncThunkOptions<TThunkArg, ThunkApiConfig> & {
  initialState?: TState;
  reducers?: ValidateSliceCaseReducers<TState, TCaseReducers>;
  extraReducers?:
    | CaseReducers<NoInfer<TState>, any>
    | ((builder: ActionReducerMapBuilder<NoInfer<TState>>) => void);
};

export type CreateLoadableSlice = {
  /**
   * create loadable slice without API config
   */
  <
    TName extends string,
    TState,
    TCaseReducers extends SliceCaseReducers<TState>,
    TArg = void
  >(
    name: TName,
    loader: LoadableLoader<TState | Promise<TState>, TArg, {}>,
    options?: LoadableOptions<TState, TArg, {}, TCaseReducers>
  ): LoadableSlice<TName, TState, TArg, TCaseReducers>;

  /**
   * create loadable slice with API config
   */
  <
    TName extends string,
    TState,
    TArg,
    TCaseReducers extends SliceCaseReducers<TState>,
    TApiConfig extends AsyncThunkConfig
  >(
    name: TName,
    loader: LoadableLoader<TState | Promise<TState>, TArg, TApiConfig>,
    options?: LoadableOptions<TState, TArg, TApiConfig, TCaseReducers>
  ): LoadableSlice<TName, TState, TArg, TCaseReducers>;
};

export interface Loadable<T = any> {
  loading: boolean;
  idle: boolean;
  loaded: boolean;
  failed: boolean;
  status: "idle" | "loading" | "failed" | "loaded";
  data: T;
  error?: any;
}

type OnReady<T> = (handler: ReadyHandler<T>) => T;

interface InternalStoreBuilder<
  TState = any,
  TAction extends AnyAction = AnyAction
> extends StoreBuilder<TState, TAction> {
  build(buildCallback: (builder: this) => any, force?: boolean): void;
}

interface InternalLoadable<T = any> extends Loadable<T> {
  meta?: {
    requestId?: any;
    extra?: {
      abort?: Function;
      defer?: ReturnType<typeof createDefer>;
    };
  };
}

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
): ClonableSlice<TState, TCaseReducers, TName> => {
  const slice = createSliceOriginal({
    ...options,
    name,
    initialState,
    reducers,
  });

  const select = createSelector((state) => state[slice.name]);

  return {
    ...slice,
    onReady,
    select: select,
    wrap(highOrderReducer, initialState) {
      return {
        // copy onReadyHandlers of current slice
        [onReadyHandlersSymbol]: (
          (this as any)[onReadyHandlersSymbol] as Function[] | undefined
        )?.slice(),
        dependencies: options?.dependencies ?? [],
        name: slice.name,
        actions: slice.actions,
        selector: select,
        getInitialState: () => initialState,
        reducer: highOrderReducer(this.reducer),
        onReady,
      };
    },
    dependencies: options?.dependencies ?? [],
    clone<TNewName extends string>(newName: TNewName) {
      return createSlice(newName, initialState, reducers, options);
    },
  };
};

export const useSelector: UseSelector = (...args: any[]) => {
  // is selector
  if (typeof args[0] === "function") {
    return selectorHook(args[0], args[1]);
  }
  // is slice
  if (
    args[0].name &&
    args[0].reducer &&
    typeof args[0].selector === "function"
  ) {
    return selectorHook(args[0].selector, args[1]);
  }
  // is combineSelectors arguments
  return selectorHook(combineSelectors(args[0], args[1]), args[2]);
};

const createStoreBuilder = (
  onBuild: (data: {
    token: any;
    enhancers: StoreEnhancer[];
    middleware: Middleware[];
    reducers: Reducer[];
    reducerMap: Record<string, Reducer>;
    preloadedState: any;
    devTools: any;
    readyHandlers: Function[];
  }) => void
): InternalStoreBuilder<any, any> => {
  let token = {};
  let reducerMap: Record<string, Reducer> = {};
  let reducers: Reducer[] = [];
  let middleware: Middleware[] = [];
  let enhancers: StoreEnhancer[] = [];
  let devTools: any;
  let preloadedState: any = {};
  let allReadyHandlers = new Set<Function>();
  let prevToken = token;

  const addSlice = (slice: SliceBase) => {
    if (reducerMap[slice.name] === slice.reducer) return;
    token = {};
    // collect ready handlers
    const readyHandlers = (slice as any)[onReadyHandlersSymbol] as Function[];
    readyHandlers?.forEach((handler) => allReadyHandlers.add(handler));
    reducerMap = { ...reducerMap, [slice.name]: slice.reducer };
    if (slice.dependencies?.length) {
      slice.dependencies.forEach(addSlice);
    }
  };

  return {
    build(buildCallback, force) {
      prevToken = token;
      buildCallback(this);
      if (!force && prevToken === token) return;
      prevToken = token;

      const readyHandlers = Array.from(allReadyHandlers);
      allReadyHandlers.clear();

      onBuild({
        token,
        reducerMap,
        reducers,
        middleware,
        enhancers,
        preloadedState,
        devTools,
        readyHandlers,
      });

      return;
    },
    withMiddleware(...inputMiddleware) {
      const newMiddleware = inputMiddleware.filter(
        (x) => !middleware.includes(x)
      );
      if (newMiddleware.length) {
        middleware = middleware.concat(newMiddleware);
        token = {};
      }
      return this;
    },
    withEnhancers(...input) {
      const newEnhancers = input.filter((x) => !enhancers.includes(x));
      if (newEnhancers.length) {
        enhancers = enhancers.concat(newEnhancers);
        token = {};
      }
      return this;
    },
    withSlice(inputSlice) {
      addSlice(inputSlice);
      return this;
    },
    withReducer(inputReducer: any) {
      if (!reducers.includes(inputReducer)) {
        reducers = reducers.concat(inputReducer);
        token = {};
      }
      return this;
    },
    withDevTools(input: any) {
      devTools = input;
      return this;
    },
    withPreloadedState(state) {
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
      readyHandlers,
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
      readyHandlers.forEach((handler) => handler(store));
    }
  );

  builder.build(buildCallback ?? ((builder) => builder), true);

  if (store) Object.assign(store, { builder });

  return store as Store<TState, TAction>;
};

const createLoadable = <T = any>(
  status: Loadable<T>["status"],
  data: T,
  error?: any
): InternalLoadable<T> => {
  return {
    data,
    error,
    status,
    loaded: status === "loaded",
    failed: status === "failed",
    idle: status === "idle",
    loading: status === "loading",
  };
};

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

const getOriginal = <T>(value: T) => {
  if (isDraft(value)) return original(value);
  return value;
};

const onReadyHandlersSymbol = Symbol("onReadyHandlers");

function onReady(this: any, handler: Function) {
  let handlers = this[onReadyHandlersSymbol] as Function[];
  if (!handlers) {
    handlers = [];
    this[onReadyHandlersSymbol] = handlers;
  }
  handlers.push((storeApi: any) => handler(storeApi, this));
  return this;
}

export const createLoadableSlice: CreateLoadableSlice = (
  name: string,
  payloadCreator: any,
  options: LoadableOptions = {}
): any => {
  let lastAbort: Function | undefined;

  const initialLoadable = createLoadable("idle", options.initialState);
  // the dataSlice is for modifying loadable.data only
  const dataSlice =
    options.reducers || options.extraReducers
      ? createSliceOriginal({
          name,
          initialState: initialLoadable.data,
          reducers: options.reducers ?? {},
          extraReducers: options.extraReducers,
        })
      : undefined;
  const thunk = createAsyncThunk(
    `${name}/load`,
    (...args) => {
      const result = payloadCreator(...args);
      lastAbort = result?.abort;
      return result;
    },
    { ...options }
  );
  const clearError = createAction(`${name}/clearError`);

  const cancel = createAction(`${name}/cancel`, () => {
    lastAbort?.();
    return { payload: undefined };
  });
  const slice = createSlice(
    name,
    initialLoadable,
    {},
    {
      extraReducers: (builder) => {
        builder
          .addCase(thunk.pending, (state, action) => {
            const meta = { requestId: action.meta.requestId };
            // we store defer object in meta object, the defer object uses for handling suspense
            Object.defineProperty(meta, "extra", {
              value: {
                defer: createDefer(),
                abort: lastAbort,
              },
              // avoid redux's 'non-serialized value in store' warning
              enumerable: false,
              configurable: false,
            });
            return {
              ...createLoadable("loading", state.data),
              meta,
            };
          })
          .addCase(thunk.fulfilled, (state, action) => {
            const originalMeta = getOriginal(state.meta);
            if (originalMeta?.requestId !== action.meta.requestId) return state;
            originalMeta?.extra?.defer?.resolve(action.payload);
            return createLoadable("loaded", action.payload);
          })
          .addCase(thunk.rejected, (state, action) => {
            const originalMeta = getOriginal(state.meta);
            if (originalMeta?.requestId !== action.meta.requestId) return state;
            originalMeta?.extra?.defer?.reject(action.error);
            return createLoadable("failed", state.data, action.error);
          })
          // clear an error and set the loadable status to idle
          .addCase(clearError, (state) => {
            if (!state.failed) return state;
            return createLoadable("idle", state.data);
          })
          .addCase(cancel, (state) => {
            // do not perform cancellation if loadable is not loading
            if (!state.loading) return state;
            state.meta?.extra?.abort?.();
            return { ...createLoadable("idle", state.data), meta: {} };
          });
        if (dataSlice) {
          builder.addDefaultCase((state, action) => {
            // prevent user changes data while the slice is loading or it has an error
            if (state.loading || state.failed) return state;

            const prevData = getOriginal(state.data);
            const nextData = dataSlice.reducer(state.data, action);

            if (prevData !== nextData) {
              return createLoadable("loaded", nextData);
            }
            return state;
          });
        }
      },
    }
  );

  return Object.assign(slice, {
    onReady,
    selectData: createSelector((state: any) => {
      const loadable = slice.select(state);
      if (loadable.failed) throw loadable.error;
      if (loadable.loading) throw loadable.meta?.extra?.defer as any;
      return loadable.data;
    }),
    actions: {
      // prepend actions for data
      ...dataSlice?.actions,
      load: thunk,
      loading: thunk.pending,
      loaded: thunk.fulfilled,
      failed: thunk.rejected,
      clearError,
      cancel,
    },
  });
};
