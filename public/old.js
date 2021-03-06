

  //  Enables map editing mode. When activated, each click in the map draws a polyline
  //  $('#map-container').find('.draw-area').click(function(){
  //    $(this).closest('#map-container').toggleClass('editing-mode');

  //    if (renderPolygonListener) return;

  //    polygonPath = [];

  //    polygon = new google.maps.Polygon({
  //      paths: [],
  //      strokeColor: "#FF0000",
  //      strokeOpacity: 0.8,
  //      strokeWeight: 3,
  //      fillColor: "#FF0000",
  //      fillOpacity: 0.35
  //    });

  //    polygon.setMap(map);

  //    renderPolygonListener = google.maps.event.addListener(map, 'click', function(e){
  //      polygonPath.push(e.latLng);
  //      polygon.setPath(polygonPath);
  //    });
  //  });

  //  // Disables editing mode. Sends the created polygon to cartodb.
  //  $('#map-container').find('.save-area').submit(function(e){
  //    e.preventDefault();
  //    $(this).closest('#map-container').toggleClass('editing-mode');
  //    $(this).find('#area_the_geom').val(JSON.stringify({
  //      "type": "MultiPolygon",
  //      "coordinates": [
  //        [
  //          $.map(polygonPath, function(latlong, index){
  //        return [[latlong.lng(), latlong.lat()]];
  //      })
  //      ]
  //      ]
  //    }));

  //    $.post($(this).attr('action'), $(this).serialize(), function(response){
  //      google.maps.event.removeListener(renderPolygonListener);
  //      renderPolygonListener = null;
  //    });
  //  });
  //}





function GFW() {
  var args = Array.prototype.slice.call(arguments),
  callback = args.pop(),
  modules = (args[0] && typeof args[0] === "string") ? args : args[0],
  config,
  i;

  if (!(this instanceof GFW)) {
    return new GFW(modules, callback);
  }

  if (!modules || modules === '*') {
    modules = [];
    for (i in GFW.modules) {
      if (GFW.modules.hasOwnProperty(i)) {
        modules.push(i);
      }
    }
  }

  for (i = 0; i < modules.length; i += 1) {
    GFW.modules[modules[i]](this);
  }

  callback(this);
  return this;
}

GFW.modules = {};

GFW.modules.app = function(gfw) {

  gfw.app = {};

  gfw.app.Instance = Class.extend({

    init: function(map, options) {
      this.options = _.defaults(options, {
        user       : 'gfw-01',
        layerTable : 'layerinfo'
      });

      this._precision = 2;

      gfw.log.enabled = options ? options.logging: false;

      this._map = map;

      this._map.overlayMapTypes.push(null);

      this.lastHash = null;

      this._cartodb = Backbone.CartoDB({user: this.options.user});

      this.datalayers = new gfw.datalayers.Engine(this._cartodb, options.layerTable, this._map);

      var overlayID =  document.getElementById("zoom_controls");

      this._loadBaseLayers();

      // zoomIn
      var zoomInControlDiv = document.createElement('DIV');
      overlayID.appendChild(zoomInControlDiv);

      var zoomInControl = new this._zoomIn(zoomInControlDiv, map);
      zoomInControlDiv.index = 1;

      // zoomOut
      var zoomOutControlDiv = document.createElement('DIV');
      overlayID.appendChild(zoomOutControlDiv);

      var zoomOutControl = new this._zoomOut(zoomOutControlDiv, map);
      zoomOutControlDiv.index = 2;

    },
    run: function() {
      this._setupListeners();
      this.update();
      gfw.log.info('App is now running!');
    },

    _loadBaseLayers: function() {
      var baseHansen = new CartoDBLayer({
        map: map,
        user_name:'wri-01',
        table_name: 'hansen_data',
        query: "SELECT * FROM hansen_data WHERE z=CASE WHEN 8<4 THEN 16 ELSE 4+8 END",
        layer_order: "bottom",
        opacity:0,
        interactive:false,
        auto_bound: false
      });

      var baseFORMA = new CartoDBLayer({
        map: map,
        user_name:'wri-01',
        table_name: 'forma_zoom_polys',
        query: "SELECT * FROM forma_zoom_polys WHERE z=CASE WHEN 8<3 THEN 16 ELSE 3+8 END",
        layer_order: "bottom",
        interactive:false,
        auto_bound: false
      });


    },

    open: function() {
      var that = this;

      var
      dh = $(window).height(),
      hh = $("header").height();

      $("#map").animate({ height: dh - hh }, 250, function() {
        google.maps.event.trigger(that._map, "resize");
        that._map.setOptions({ scrollwheel: true });
        $("body").css({overflow:"hidden"});
      });

    },

    close: function(callback) {
      var that = this;

      $("#map").animate({height: 400 }, 250, function() {

        google.maps.event.trigger(that._map, "resize");
        that._map.setOptions({ scrollwheel: false });
        $("body").css({ overflow:"auto" });

        if (callback) {
          callback();
        }

      });

    },

    _zoomIn: function(controlDiv, map) {
      controlDiv.setAttribute('class', 'zoom_in');

      google.maps.event.addDomListener(controlDiv, 'mousedown', function() {
        var zoom = map.getZoom() + 1;
        if (zoom < 20) {
          map.setZoom(zoom);
        }
      });
    },

    _zoomOut: function(controlDiv, map) {
      controlDiv.setAttribute('class', 'zoom_out');

      google.maps.event.addDomListener(controlDiv, 'mousedown', function() {
        var zoom = map.getZoom() - 1;
        if (zoom > 2) {
          map.setZoom(zoom);
        }
      });
    },

    _showHansen: function() {

    },
    _showForma: function() {

    },

    _setupListeners: function(){
      var that = this;

      Legend.init();

      // Setup listeners
      google.maps.event.addListener(this._map, 'zoom_changed', this._updateHash);
      google.maps.event.addListener(this._map, 'dragend', this._updateHash);
      google.maps.event.addListenerOnce(this._map, 'tilesloaded', this._mapLoaded);
      google.maps.event.addListener(map, 'click', function(event) { console.log(event.latLng); });

    },
    _mapLoaded: function(){
      config.mapLoaded = true;

      Circle.init();
      Timeline.init();
      Filter.init();

      showMap ? Navigation.showState("map") : Navigation.showState("home");
    },
    _updateHash: function() {

      var
      zoom = this.getZoom(),
      lat  = this.getCenter().lat().toFixed(this._precision),
      lng  = this.getCenter().lng().toFixed(this._precision);
      hash = "/map/" + zoom + "/" + lat + "/" + lng;

      History.pushState({ state: 3 }, "Map", hash);
    },
    _parseHash: function(hash) {

      var args = hash.split("/");

      if (args.length >= 3) {

        var
        zoom = parseInt(args[2], 10),
        lat  = parseFloat(args[3]),
        lon  = parseFloat(args[4]);

        if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
          return false;
        }

        return {
          center: new google.maps.LatLng(lat, lon),
          zoom: zoom
        };
      }

      return false;
    },
    update: function() {
      var hash = location.hash;

      if (hash === this.lastHash) {
        // console.info("(no change)");
        return;
      }

      var
      State  = History.getState(),
      parsed = this._parseHash(State.hash);

      if (parsed) {
        this._map.setZoom(parsed.zoom);
        this._map.setCenter(parsed.center);
      }

    }
  });
};

GFW.modules.maplayer = function(gfw) {
  gfw.maplayer = {};
  gfw.maplayer.Engine = Class.extend(
    {
    init: function(layer, map) {
      this.layer = layer;
      this._map = map;
      this._bindDisplay(new gfw.maplayer.Display());
      this._options = this._display.getOptions(this.layer.get('tileurl'), this.layer.get('ispng'));
      // this._boundingbox = this.layer.get('the_geom');
      var sw = new google.maps.LatLng(this.layer.get('ymin'), this.layer.get('xmin'));
      var ne = new google.maps.LatLng(this.layer.get('ymax'),this.layer.get('xmax'));
      this._bounds = new google.maps.LatLngBounds(sw, ne);

      gfw.log.info(this._options.getTileUrl({x: 3, y: 4},3));

      this._displayed = false;
      this._maptype = new google.maps.ImageMapType(this._options);

      this._tileindex = this._map.overlayMapTypes.length;
      this._map.overlayMapTypes.setAt(this._tileindex, null);
      this._setupListeners();


      if (this.layer.get('title') != 'FORMA'){
        this.layer.attributes['visible'] = false;
      }

      this._addControl();
      this._handleLayer();
    },

    _setupListeners: function(){
      var that = this;

      //setup zoom listener
      google.maps.event.addListener(this._map, 'zoom_changed', function() {
        that._inZoom(true);
        that._handleLayer();
      });

      google.maps.event.addListener(this._map, 'dragend', function() {
        that._inBounds(true);
        that._handleLayer();
      });

      this._inZoom(true);
      this._inBounds(true);
    },

    _inZoom: function(reset){

      if (this._inZoomVal == null){
        this._inZoomVal = true;
      }

      if (reset){
        if (this.layer.get('zmin')<=this._map.getZoom() && this._map.getZoom()<=this.layer.get('zmax')) {
          this._inZoomVal = true;
        } else {
          this._inZoomVal = false;
        }
      }
      return this._inZoomVal;
    },
    _inBounds: function(reset){
      if (this._inBoundsVal == null) {
        this._inBoundsVal = true;
      }
      if (reset){
        var bounds = this._map.getBounds();
        if (bounds) {
          var ne = bounds.getNorthEast();
          var sw = bounds.getSouthWest();
          if (this._bounds.intersects(bounds)){
            this._inBoundsVal = true;
          } else {
            this._inBoundsVal = false;
          }
        }

      }
      return this._inBoundsVal;
    },
    _inView: function(){
      if (this._inZoom(false) && this._inBounds(false)) {
        return true;
      } else {
        return false;
      }
    },
    _handleLayer: function(){

      if (this.layer.get('visible') && !this._displayed && this._inView()){
        this._displayed = true;
        this._map.overlayMapTypes.setAt(this._tileindex, this._maptype);
        gfw.log.info(this.layer.get('title')+ " added at "+this._tileindex);
      } else if (this._displayed && !this._inView()){
        this._displayed = false;
        this._map.overlayMapTypes.setAt(this._tileindex, null);
        gfw.log.info(this.layer.get('title')+ " removed at "+this._tileindex);
      }
    },
    _addControl: function(){
      var that = this;

      var clickEvent = function() {

        that._toggleLayer();
        that._maptype.setOpacity(100);

        var
        title      = that.layer.get('title'),
        category   = that.layer.get('category_name'),
        visibility = that.layer.get('visible');

        if (category != 'Deforestation') {
          Legend.toggleItem(title, category, visibility);
        }

      };

      var zoomEvent = function() {
        if (that.layer.attributes['visible']) {
          that._map.fitBounds(that._bounds);
        }
      };

      Filter.addFilter(this.layer.get('category_name'), this.layer.get('title'), clickEvent, zoomEvent);

    },
    _bindDisplay: function(display) {
      var that = this;
      this._display = display;
      display.setEngine(this);
    },
    _toggleLayer: function(){
      var that = this;

      this.layer.attributes['visible'] = !this.layer.attributes['visible'];

      var
      id      = this.layer.attributes['title'].replace(/ /g, "_").toLowerCase(),
      visible = this.layer.get('visible');

      $.jStorage.set(id, visible);

      var // special layerse
      forma  = GFW.app.datalayers.LayersObj.get(1),
      hansen = GFW.app.datalayers.LayersObj.get(565);

      if (id === 'forma' && showMap && visible ) {
        Timeline.show();
      } else if ( (id === 'forma' && showMap) || (id === 'hansen' && showMap && visible) ) {
        Timeline.hide();
      }

      if (visible) {

        this._displayed = true;
        this._map.overlayMapTypes.setAt(this._tileindex, this._maptype);

        // FORMA = 1 / Hansen = 2
        if (this._tileindex == 1) {
          this._map.overlayMapTypes.setAt(2, null);
          hansen.attributes['visible'] = false;
        } else if (this._tileindex == 2) {
          this._map.overlayMapTypes.setAt(1, null);
          forma.attributes['visible'] = false;
        }

      } else {
        //if ( this._inView() ){
          this._map.overlayMapTypes.setAt(this._tileindex, null);
        //}
      }
    }
  });
  gfw.maplayer.Display = Class.extend(
    {
    /**
     * Constructs a new Display with the given DOM element.
     */
    init: function() {
      gfw.log.info('displayed');
    },

    /**
     * Sets the engine for this display.
     *
     * @param engine a mol.ui.Engine subclass
     */
    setEngine: function(engine) {
      this._engine = engine;
    },
    getTileUrl: function(tile, zoom) {
      var that = this;
      var url = that.tileurl.replace(RegExp('\\{Z}', 'g'), zoom);
      url = url.replace(RegExp('\\{X}', 'g'), tile.x);
      url = url.replace(RegExp('\\{Y}', 'g'), tile.y);
      return url;
    },
    getOptions: function(tileurl, ispng){
      var that = this;
      var options = {
        alt: "MapServer Layer",
        getTileUrl: this.getTileUrl,
        tileurl: tileurl,
        isPng: ispng,
        maxZoom: 17,
        minZoom: 1,
        name: "MapServer Layer",
        tileSize: new google.maps.Size(256, 256)
      };
      return options;
    }
  }
  );
};

GFW.modules.datalayers = function(gfw) {
  gfw.datalayers = {};

  gfw.datalayers.Engine = Class.extend(
    {
    init: function(CartoDB, layerTable, map) {

      this._map         = map;
      this._bycartodbid = {};
      this._bytitle     = {};
      this._dataarray   = [];
      this._cartodb     = CartoDB;

      var LayersColl    = this._cartodb.CartoDBCollection.extend({
        sql: function(){
          return "SELECT cartodb_id AS id, title, category_name, zmin, zmax, ST_XMAX(the_geom) AS xmax, \
          ST_XMIN(the_geom) AS xmin, ST_YMAX(the_geom) AS ymax, ST_YMIN(the_geom) AS ymin, tileurl, true AS visible \
          FROM " + layerTable + " \
          WHERE display = TRUE ORDER BY displaylayer ASC";
        }
      });

      this.LayersObj = new LayersColl();
      this.LayersObj.fetch();
      this._loadLayers();
    },
    _loadLayers: function(){
      var that = this;

      this.LayersObj.bind('reset', function() {
        that.LayersObj.each(function(p) {
          that._addLayer(p);
        });
      });

    },
    _addLayer: function(p){
      gfw.log.warn('only showing baselayers for now');

      //if (p.get('category') == 'baselayer') {
      var layer = new gfw.maplayer.Engine(p, this._map);

      this._dataarray.push(layer);
      this._bycartodbid[p.get('cartodb_id')] = layer;
      this._bytitle[p.get('title')] = layer;
      //}
    }
  });
};

/**
 * Logging module that gfwtes log messages to the console and to the Speed
 * Tracer API. It contains convenience methods for info(), warn(), error(),
 * and todo().
 *
 */
GFW.modules.log = function(gfw) {
  gfw.log = {};

  gfw.log.info = function(msg) {
    gfw.log._gfwte('INFO: ' + msg);
  };

  gfw.log.warn = function(msg) {
    gfw.log._gfwte('WARN: ' + msg);
  };

  gfw.log.error = function(msg) {
    gfw.log._gfwte('ERROR: ' + msg);
  };

  gfw.log.todo = function(msg) {
    gfw.log._gfwte('TODO: '+ msg);
  };

  gfw.log._gfwte = function(msg) {
    var logger = window.console;
    if (gfw.log.enabled) {
      if (logger && logger.markTimeline) {
        logger.markTimeline(msg);
      }
      console.log(msg);
    }
  };
};
