module.exports = proxy;

// TODO deproxy everything when process ends
// - probably have a proxyAgent method that de-proxies when agent emits end
function proxy(proxy, target, originalName, newName) {
  newName = newName || originalName;

  target.on(originalName, function() {
    proxy.emit.apply(proxy, [newName].concat([].slice.call(arguments)).concat(proxy));
  });
}
