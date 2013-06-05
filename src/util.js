include("extend_classify.js");

function _map(fn, arr) {
  if (typeof arr.map == 'function') return arr.map(fn);
  else {
    for (var i=0, l=arr.length, rt=[]; i<l; i++) {
      var itm = fn(arr[i], i);
      rt.push(itm);
    }
    return rt;
  }
}

function _clip(val, max, min) {
  return (val < min) ? min : (max < val) ? max : val;
}

function _fashion_color(c) {
  return  ((c instanceof Fashion.Color) ? c :
           (typeof c == 'string') ? new Fashion.Color(c) :
           null);
}

function _fashion_fill(c) {
  return ((c instanceof Fashion.FloodFill) ? c :
          (c = _fashion_color(c)) ? new Fashion.FloodFill(c) :
          null);
}

function _convert_fashion(def) {
  if (!(typeof def == 'object' && def.constructor == Object)) return def;
  var rt = {};
  for (var i in def) {
    if (i === 'color') {
      rt[i] = _fashion_color(def[i]);
    } else if (i === 'fill') {
      rt[i] = _fashion_fill(def[i]);
    } else {
      rt[i] = _convert_fashion(def[i]);
    }
  }
  return rt;
}

var SortedList = classify('SortedList', {
  static: {
    Tuple: classify('SortedList_Tuple', {
      parent: Array,
      method: {
        arrayize: function() {
          return Array.prototype.slice.call(this);
        }
      }
    })
  },
  property: {
    index:    [],
    tbl:      {},
  },
  method: {
    init: function() {
    },
    put: function(idx, data) {
      var index = this.index;
      var last = this.tbl[idx];
      if (last === void(0)) {
        this.tbl[idx] = data;
        var s = 0, e = index.length;
        while (s != e) {
          var c = (s + e) >> 1;
          if (index[c] < idx) s = c + 1;
          else e = c;
        }
        index.splice(s, 0, idx);
      } else if (last !== data) {
        if (last instanceof SortedList.Tuple) last.push(data);
        else {
          var a = SortedList.Tuple();
          a.push(last); a.push(data);
          this.tbl[idx] = a;
        }
      }
    },
    get: function(idx) {
      var rt = this.tbl[idx];
      if (rt instanceof SortedList.Tuple) {
        rt = rt.arrayize();
      }
      return rt;
    },
    replace: function(old_idx, data, new_idx, add_if_not) {
      var removed = this.remove(old_idx, data, true);
      if (removed || add_if_not) this.put(new_idx, data);
    },
    remove: function(idx, data, ignore_error) {
      var d = this.tbl[idx];
      if (d instanceof SortedList.Tuple) {
        var i = d.indexOf(data);
        if (i < 0) {
          if (ignore_error) return false;
          throw new Error('Cannot determine which object to remove.');
        }
        d.splice(i, 1);
        var len = d.length;
        if (len == 1) {
          this.tbl[idx] = d[0];
        }
      } else if (d !== void(0)) {
        delete this.tbl[idx];
        var i = this.index.indexOf(idx);
        this.index.splice(i, 1);
      } else {
        if (ignore_error) return false;
        throw new Error('Object not found.');
      }
      return true;
    },
    range_get: function(min, max, filtered_src) {
      if (min > max) return [];
      var index = this.index;
      var len = index.length;
      var s = 0, e = len, x = 0;
      while (s != e) {
        var c = (s + e) >> 1;
        if (index[c] < min) s = c + 1;
        else e = c;
      }
      var min_idx = s;
      s = min_idx; e = len;
      while (s != e) {
        var c = (s + e) >> 1;
        if (index[c] < max) s = c + 1;
        else e = c;
      }
      var max_idx = (len <= s || max < index[s]) ? s - 1 : s;
      var rt = [];
      if (filtered_src) {
        for (; min_idx <= max_idx; min_idx++) {
          var r = this.tbl[index[min_idx]];
          if (r instanceof SortedList.Tuple) {
            for (var i=0,l=r.length; i<l; i++) {
              if (0 <= filtered_src.indexOf(r[i])) rt.push(r[i]);
            }
          } else {
            if (0 <= filtered_src.indexOf(r)) rt.push(r);
          }
        }
      } else {
        for (; min_idx <= max_idx; min_idx++) {
          var r = this.tbl[index[min_idx]];
          if (r instanceof SortedList.Tuple) {
            rt = rt.concat(r.arrayize());
          } else {
            rt.push(r);
          }
        }
      }
      return rt;
    }
  }
});

var UniqueList = classify("UniqueList", {
  property: {
    src: [],
    length: 0
  },
  method: {
    push: function(itm) {
      if (this.src.indexOf(itm) < 0) {
        this.src.push(itm);
        this.length++;
      }
    },
    unshift: function(itm) {
      if (this.src.indexOf(itm) < 0) {
        this.src.unshift(itm);
        this.length++;
      }
    },
    pop: function(itm) {
      var rt;
      if (itm) {
        var idx = this.src.indexOf(itm);
        if (idx < 0) throw new Error('The item ' + itm + ' is not found on list.');
        rt = this.src.splice(idx, 1)[0];
      } else {
        rt = this.src.pop();
      }
      this.length--;
      return rt;
    },
    shift: function(itm) {
      if (itm) return this.pop(itm);
      this.length--;
      return this.src.shift();
    },
    map: function(fn) {
      for (var i=0, l=this.length; i < l; i++) {
        this.src[i] = fn(this.src[i], i);
      }
    },
    clear: function() {
      this.src = [];
      this.length = 0;
    },
  }
});
