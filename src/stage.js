var Stage = classify('Stage', {
  property: {
    elem: null,
    d:    null,
    shift_key: false,
    size: {},
    selected_nodes: null,
    nodes: []
  },
  method: {
    init: function(selector) {
      var self = this;
      this.elem = $(selector);
      this.elem.attr({tabindex: 0});
      this.elem.css({outline: 'none'});
      this.elem.keydown(function(e) {
        self.keydown(e);
        return false;
      });
      this.elem.keyup(function(e) {
        self.keyup(e);
        return false;
      });
      this.d = new Fashion.Drawable(this.elem[0]);
      this.size = {
        x: this.elem.width(),
        y: this.elem.height()
      };
      this.draw_background();
      this.d.addEvent({
        mouseup: function(e) {
          if (!self.shift_key) self.unselect_all();
        }
      });
      this.selected_nodes = new UniqueList();
    },
    draw: function(node) {
      this.d.draw(node.d);
      this.nodes.push(node);
      node.drawed(this);
    },
    erase: function(node) {
      this.d.erase(node.d);
      var idx = this.nodes.indexOf(node);
      if (-1 < idx) this.nodes.splice(idx, 1);
      node.erased(this);
    },
    select_all: function() {
      for (var i = 0, l = this.nodes.lenght; i<l; i++) {
        this.nodes[i].select();
      }
    },
    select: function(node) {
      if (!this.shift_key) this.unselect_all();
      this.selected_nodes.push(node);
      node.change({ zIndex: this.d.getMaxDepth() + 1 });
    },
    unselect: function(node) {
      this.selected_nodes.pop(node);
    },
    unselect_all: function() {
      var ns = this.selected_nodes;
      ns.map(function(node, idx) {
        node.unselect(true);
      });
      ns.clear();
    },
    viewport: function() {
      return this.d.viewportSize();
    },
    keydown: function(e) {
      var c = e.keyCode;
      switch (c) {
      case 8: // backspace
        var ns = this.selected_nodes;
        ns.map(function(node, idx) {
          node.unselect(true);
          node.erase();
        });
        ns.clear();
        break;
      case 16: // shift
        this.shift_key = true;
        break;
      }
    },
    keyup: function(e) {
      var c = e.keyCode;
      switch (c) {
      case 16:
        this.shift_key = false;
        break;
      }
    },
    draw_background: function() {
      var span = 20;
      var s = this.size;
      var c = new Fashion.Color("#000");
      var w = 0.5;
      var pat = [1, 4];
      for (var l = span; l < s.x; l+=span) {
        this.d.draw(
          new Fashion.Path({
            points: new Fashion.PathData([['M', l, -0.5], ['L', l, s.y]]), //'M '+l+' -0.5 L '+l+' '+s.h
            style: {
              fill: null,
              stroke: { width: w, color: c, pattern: pat }
            },
          })
        );
      }
      for (var h = span; h < s.y; h+=span) {
        this.d.draw(
          new Fashion.Path({
            points: new Fashion.PathData([['M', -0.5, h], ['L', s.x, h]]),
            style: {
              fill: null,
              stroke: { width: w, color: c, pattern: pat }
            },
          })
        );
      }
    }
  }
});