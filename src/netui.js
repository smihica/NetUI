(function(window) {

  var NetUI = {};

  include("util.js");
  include("element_base.js");
  include("pipe.js");
  include("point.js");
  include("node.js");
  include("stage.js");

  NetUI.Pipe  = Pipe;
  NetUI.Point = Point;
  NetUI.Node  = Node;
  NetUI.Stage = Stage;

  function convert_fashion(def) {
    if (!(typeof def == 'object' && def.constructor == Object)) return def;
    var rt = {};
    for (var i in def) {
      if (i === 'color') {
        rt[i] = new Fashion.Color(def[i]);
      } else if (i === 'fill') {
        rt[i] = new Fashion.FloodFill(new Fashion.Color(def[i]));
      } else {
        rt[i] = convert_fashion(def[i]);
      }
    }
    return rt;
  }

  var pipe_types = {};
  NetUI.definePipeType = function(name, definition) {
    function wrap(d) {
      return d ? { fill: null, stroke: d } : null;
    }
    var style       = convert_fashion(definition.style);
    style.base      = wrap(style.base);
    style.hover     = wrap(style.hover) || style.base;
    style.highlight = wrap(style.highlight) || style.base;
    pipe_types[name] = { style: style };
  }

  var point_types = {};
  NetUI.definePointType = function(name, definition) {
    point_types[name] = definition;
  };

  var node_types = {};
  NetUI.defineNodeType = function(name, definition) {
    var def = {};
    function wrap(d) {
      return d ? { fill:   d.fill ? d.fill : null,
                   stroke: d.stroke ? d.stroke : null } : null;
    }
    var style = convert_fashion(definition.style);
    style.base = wrap(style.base);
    style.hover     = wrap(style.hover) || style.base;
    style.highlight = wrap(style.highlight) || style.base;
    def.style = style;

    if (definition.body) {
      def.body = definition.body;
    } else if (definition.body_url) {
      $.ajax({
        url: definition.body_url,
        type: 'get',
      }).done(function(txt) {
        def.body = txt;
      });
    } else {
      def.body = '';
    }

    def.points = definition.points;

    node_types[name] = def;
  };

  NetUI.createPoint = function(node, type, definition) {
    var _default = point_types[type];
    var origin = (definition && definition.position && definition.position.origin) || 'left-top';
    var offset = (definition && definition.position && definition.position.offset) || {x: 10, y: 10};
    var radius = 4;
    var pipe_style = pipe_types[_default.pipe].style;
    var connect_filter = function(pt) {
      return -1 < _default.connectable.indexOf(pt.options.type);
    };
    node.add_point({
      origin: origin,
      offset: offset,
      radius: radius,
      pipe_style: pipe_style,
      connect_filter: connect_filter,
      type: type
    });
  };

  NetUI.createNode = function(stage, type, definition) {
    var vp = stage.viewport();
    var settings = node_types[type];
    console.log(settings);
    var node = new NetUI.Node({
      stage: stage,
      unbind: function(itm) {}
    }, {
      position: (definition && definition.position) || { x: (vp.x / 2) - 50, y: (vp.y / 2) - 50},
      size:     (definition && definition.size) || 'auto',
      zIndex:   stage.d.getMaxDepth() + 1,
      body:     settings.body,
      padding:  20,
      style:    settings.style
    });
    for (var i = 0, l = settings.points.length; i<l; i++) {
      var p = settings.points[i];
      NetUI.createPoint(node, p.type, p);
    }
  };

  window.NetUI = NetUI;

})(this);