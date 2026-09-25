import { QueryClient, type QueryFunction } from "@tanstack/react-query";

async function throwIfNotOk(response: Response) {
  if (!response.ok) {
    const message = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${message}`);
  }
}

export async function apiRequest(method: string, url: string, data?: unknown) {
  const response = await fetch(url, {
    method,
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  await throwIfNotOk(response);
  return response;
}

const queryFn: QueryFunction = async ({ queryKey }) => {
  const response = await fetch(queryKey.join("/"));
  await throwIfNotOk(response);
  return response.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn,
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: Infinity,
    },
    mutations: { retry: false },
  },
});
