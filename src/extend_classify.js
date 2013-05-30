// Generic definition of setter and getter.
classify.addDirective("accessor", function(context, key, value) {
  context.property['_'+key] = value;
  context.method[key] = function (v) {
    if (0 < arguments.length) this['_'+key] = v;
    return this['_'+key];
  };
  return context;
});

(function() {

  // before / after
  // To enable to use method combination pattern.

  function find_method_recursively(_class, name) {
    return ((_class) ? (_class.prototype[name] || find_method_recursively(_class.__proto__, name)) : null);
  };

  classify.addDirective("after", function(context, key, value) {
    var meth = context.method[key] || find_method_recursively(context.parent, key);
    if (!meth) throw new Error('Declaration Error: after "' + key + '" is given but the target method not found.');
    context.method[key] = function() {
      var rt = meth.apply(this, arguments);
      value.apply(this, arguments);
      return rt;
    };
    return context;
  });

  classify.addDirective("before", function(context, key, value) {
    var meth = context.method[key] || find_method_recursively(context.parent, key);
    if (!meth) throw new Error('Declaration Error: before "' + key + '" is given but the target method not found.');
    context.method[key] = function() {
      value.apply(this, arguments);
      var rt = meth.apply(this, arguments);
      return rt;
    };
    return context;
  });

})();