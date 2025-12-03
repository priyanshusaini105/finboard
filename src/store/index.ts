import { configureStore } from "@reduxjs/toolkit";
import widgetsReducer from "./slices/widgetsSlice";
import dashboardReducer from "./slices/dashboardSlice";

// First create store without middleware to avoid circular reference
const makeStore = () => {
  return configureStore({
    reducer: {
      widgets: widgetsReducer,
      dashboard: dashboardReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types
          ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        },
      }),
  });
};

export const store = makeStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
