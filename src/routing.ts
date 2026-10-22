export type ClassRoute = {kind: "home"} | {kind: "invalid"} | {kind: "class"; classNumber: number};

export const parseClassRoute = (pathname: string): ClassRoute => {
  if (pathname === "/") return {kind: "home"};
  const match = /^\/class\/([1-9]\d*)\/?$/.exec(pathname);
  if (!match) return {kind: "invalid"};
  const classNumber = Number(match[1]);
  return Number.isSafeInteger(classNumber) ? {kind: "class", classNumber} : {kind: "invalid"};
};

export const currentPath = (): string => window.location.pathname;

// 뒤로 가기·앞으로 가기와 같은 페이지 안의 주소 변경을 구독합니다.
export const subscribeToPath = (notify: () => void): (() => void) => {
  const push = window.history.pushState;
  const replace = window.history.replaceState;
  const onPush: History["pushState"] = function (...args) { push.apply(window.history, args); notify(); };
  const onReplace: History["replaceState"] = function (...args) { replace.apply(window.history, args); notify(); };
  window.history.pushState = onPush;
  window.history.replaceState = onReplace;
  window.addEventListener("popstate", notify);
  return () => {
    window.removeEventListener("popstate", notify);
    if (window.history.pushState === onPush) window.history.pushState = push;
    if (window.history.replaceState === onReplace) window.history.replaceState = replace;
  };
};
