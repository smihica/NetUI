COMPRESS=uglifyjs
CONSTRUCT=tools/jsconstruct
BUILDDIR=.

all:		netui.js netui.min.js

clean:
		rm -f netui.js netui.min.js

netui.js:       src/*.js
	        $(CONSTRUCT) -o netui.js src/netui.js

netui.min.js:   netui.js
		$(COMPRESS) --unsafe -nc -o netui.min.js netui.js

.PHONY:		all clean
