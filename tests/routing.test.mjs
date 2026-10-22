import test from "node:test";
import assert from "node:assert/strict";
import {parseClassRoute, subscribeToPath, currentPath} from "../src/routing.ts";

test("home never selects a classroom", () => assert.deepEqual(parseClassRoute("/"), {kind:"home"}));
test("class URLs and trailing slash", () => {
  for (const [url, number] of [["/class/12",12],["/class/23/",23],["/class/31",31]])
    assert.deepEqual(parseClassRoute(url), {kind:"class",classNumber:number});
});
test("invalid paths and unsafe numbers", () => {
  for (const url of ["/class", "/class/", "/class/0", "/class/-1", "/class/01", "/class/1.2", "/class/12/extra", "/other", "/class/9007199254740992", "/class/%31%32"])
    assert.deepEqual(parseClassRoute(url), {kind:"invalid"});
});
test("history navigation notifies and cleanup restores history", () => {
  const events = new EventTarget();
  const oldWindow = globalThis.window;
  const location = {pathname:"/class/12"};
  const history = {
    pushState(_data, _unused, url) { location.pathname = url; },
    replaceState(_data, _unused, url) { location.pathname = url; },
  };
  const originalPush = history.pushState;
  globalThis.window = {location, history, addEventListener:events.addEventListener.bind(events), removeEventListener:events.removeEventListener.bind(events)};
  try {
    let notifications = 0;
    const unsubscribe = subscribeToPath(() => notifications++);
    history.pushState(null,"","/class/23");
    assert.equal(currentPath(),"/class/23");
    history.replaceState(null,"","/class/31");
    events.dispatchEvent(new Event("popstate"));
    assert.equal(notifications,3);
    unsubscribe();
    assert.equal(history.pushState,originalPush);
    events.dispatchEvent(new Event("popstate"));
    assert.equal(notifications,3);
  } finally { globalThis.window = oldWindow; }
});
