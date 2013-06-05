var Text = classify('Text', {
  parent: ElementBase,
  property: {},
  static: {
    style: {
      color: _fashion_color('#000'),
      fontFamily: 'Arial',
      fontSize: 12,
      offset: { x: 0, y: 0 },
      opacity: { normal: 255, soft: 160 }
    }
  },
  method: {
    init: function() {
      this.__super__().init.apply(this, arguments);
    },
    make_instance: function(parent, options) {
      var p;
      if (options.origin && options.origin === 'center') p = parent.center();
      else p = parent.position();
      var z = parent.zIndex() + 1;
      var t = new Fashion.Text({
        anchor: options.anchor || 'left',
        position: {
          x: p.x + options.offset.x,
          y: p.y + options.offset.y
        },
        text: options.text,
        zIndex: z,
        fontFamily: options.fontFamily || Text.style.fontFamily,
        fontSize: options.fontSize || Text.style.fontSize
      });
      t.style({fill: _fashion_fill(options.color || Text.style.color)});
      return t;
    },
    parent_changed: function() {
      var pos;
      if (this.options.origin && this.options.origin === 'center')
        pos = this.parent.center();
      else pos = this.parent.position();
      var z   = this.parent.zIndex() + 1;
      this.d.position({
        x: pos.x + this.options.offset.x,
        y: pos.y + this.options.offset.y
      });
      this.d.zIndex(z);
    },
    soften: function(sw) {
      var fill = this.d.style().fill;
      fill.color.a = sw ? Text.style.opacity.soft : Text.style.opacity.normal;
      this.d.style({fill: fill});
    },
    _through_event: function(target, ev_name, e) {
      if (target && this[target]) {
        e.offsetPosition.x += this.options.offset.x;
        e.offsetPosition.y += this.options.offset.y;
        this[target][ev_name](e);
      }
    },
    click: function(e) {
      this._through_event(this.options.through_event, 'click', e);
    },
    drag_start: function(e) {
      this._through_event(this.options.through_event, 'drag_start', e);
    },
    drag: function(e) {
      this._through_event(this.options.through_event, 'drag', e);
    },
    drag_end: function(e) {
      this._through_event(this.options.through_event, 'drag_end', e);
    }
  }
});
