(function(window) {

  include("util.js");
  include("element_base.js");
  include("text.js");
  include("pipe.js");
  include("point.js");
  include("button.js");
  include("node.js");
  include("stage.js");

  var NetUI = classify('NetUI', {
    static: {
      Pipe:  Pipe,
      Point: Point,
      Node:  Node,
      Stage: Stage,

      types: {
        pipe:  {},
        point: {},
        node:  {}
      },
      type_definitions: {
        pipe:  {},
        point: {},
        node:  {}
      },
      definePipeType: function (definitions) {
        function wrap(d) {
          return d ? { fill: null, stroke: d } : null;
        }
        for (var name in definitions) {
          var definition  = definitions[name];
          this.type_definitions.pipe[name] = definition;
          var style       = _convert_fashion(definition.style);
          style.base      = wrap(style.base);
          style.hover     = wrap(style.hover) || style.base;
          style.highlight = wrap(style.highlight) || style.base;
          this.types.pipe[name] = { style: style };
        }
      },
      definePointType: function (definitions) {
        for (var name in definitions) {
          var d = definitions[name];
          this.type_definitions.point[name] = d;
          this.types.point[name] = _convert_fashion(d);
        }
      },
      defineNodeType: function (definitions, onDefinitionFinished) {
        var self = this;
        function wrap(d) {
          return d ? { fill:   d.fill ? d.fill : null,
                       stroke: d.stroke ? d.stroke : null } : null;
        }
        var names = [];
        var notify = function(name) {
          names.splice(names.indexOf(name), 1);
          if (names.length == 0 && onDefinitionFinished)
            onDefinitionFinished();
        };
        for (var name in definitions) (function(name) {
          names.push(name);
          var d  = definitions[name];
          self.type_definitions.node[name] = d;
          var def = {};
          var style = _convert_fashion(d.style);
          style.base = wrap(style.base);
          style.hover = wrap(style.hover) || style.base;
          style.highlight = wrap(style.highlight) || style.base;
          def.style = style;
          if (d.body) {
            def.body = d.body;
          } else if (d.body_url) {
            $.ajax({
              url: d.body_url,
              type: 'get',
            }).done(function(txt) {
              def.body = txt;
              notify(name);
            });
          } else {
            def.body = '';
          }
          def.points = d.points;
          def.data_binds = d.data_binds;
          def.buttons = d.buttons;
          self.types.node[name] = def;
        })(name);
      },
      createPoint: function (node, name, type, definition) {
        var d = definition;
        var _default = this.types.point[type];
        var origin = (d && d.position && d.position.origin) || 'left-top';
        var offset = (d && d.position && d.position.offset) || {x: 10, y: 10};
        var radius = 4;
        var pipe_style = this.types.pipe[_default.pipe].style;
        var connect_filter = function(pt) {
          return -1 < _default.connectable.indexOf(pt.options.type);
        };
        var label = (d && d.hasOwnProperty('label')) ? d.label : _default.label;
        node.add_point(name, {
          position: {
            origin: origin,
            offset: offset,
          },
          radius: radius,
          pipe_style: pipe_style,
          connect_filter: connect_filter,
          connections: d.connections || [],
          type: type,
          label: label,
          color: (d && d.color) || _default.color
        });
      },
      createNode: function (stage, type, definition) {
        var d = definition;
        var vp = stage.viewport();
        var settings = this.types.node[type];

        var datas = {};
        for (var k in settings.data_binds) {
          var v = settings.data_binds[k];
          if (d && d.datas && d.datas.hasOwnProperty(k)) {
            v = d.datas[k];
          }
          datas[k] = v;
        }

        var node = new this.Node({
          stage: stage,
          unbind: function(itm) {}
        }, {
          position: (d && d.position) || { x: (vp.x / 2) - 50, y: (vp.y / 2) - 50},
          size:     (d && d.size)     || 'auto',
          zIndex:   (d && d.zIndex)   || stage.d.getMaxDepth() + 1,
          body:     settings.body,
          datas:    datas,
          padding:  25,
          style:    settings.style,
          type:     type,
          color:    ((d && d.color) ||
                     (d && d.style && d.style.color) ||
                     (settings.style && settings.style.color) ||
                     settings.color),
          buttons:  settings.buttons
        });
        if (d && d.points) {
          for (var name in d.points) {
            var p = d.points[name];
            this.createPoint(node, name, p.type, p);
          }
        } else {
          for (var name in settings.points) {
            var p = settings.points[name];
            this.createPoint(node, name, p.type, p);
          }
        }
        if (d && d.selecting) node.select(false, true);
        else node.unselect(false, true);
      },
      dump_data_network: function(stage, pretty) {
        for (var i=0, l=stage.elems.length, net = []; i<l; i++) {
          var n = stage.elems[i];
          if (n instanceof Node) net.push(n.dump_data_network());
        }
        return ((pretty) ?
                JSON.stringify(net, null, pretty) :
                JSON.stringify(net));
      },
      dump: function(stage, pretty) {
        for (var i=0, l=stage.elems.length, nodes = []; i<l; i++) {
          var n = stage.elems[i];
          if (n instanceof Node) nodes.push(n.dump());
        }
        var rt = {
          nodes: nodes,
          types: this.type_definitions,
        };
        if (pretty) {
          return JSON.stringify(rt, null, pretty);
        }
        return JSON.stringify(rt);
      },
      load: function(stage, data, with_clear) {
        if (with_clear) {
          stage.clear();
          this.type_definitions = {
            pipe:  {},
            point: {},
            node:  {}
          };
        }
        var data = JSON.parse(data);
        function define_types() {
          if (stage) {
            var types = data['types'];
            for (var t in types) {
              var type = types[t];
              switch (t) {
              case 'pipe':
                NetUI.definePipeType(type);
                break;
              case 'point':
                NetUI.definePointType(type);
                break;
              case 'node':
                NetUI.defineNodeType(type, create_nodes);
                break;
              }
            }
          }
        }
        function create_nodes() {
          var nodes = data['nodes'];
          for (var i=0,l=nodes.length; i<l; i++) {
            var node = nodes[i];
            NetUI.createNode(stage, node.type, {
              position:  node.position,
              size:      node.size,
              zIndex:    node.zIndex,
              selecting: node.selecting,
              points:    node.points,
              datas:     node.datas,
            });
          }
        }
        define_types();
      }
    }
  });

  window.NetUI = NetUI;

})(this);