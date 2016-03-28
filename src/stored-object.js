(function(window, angular, undefined) {'use strict';

/**
 * @ngdoc overview
 * @name index
 * @description
 *
 * The `angular-stored-object` package provides a single module, {@link yaacovCR.storedObject `yaacovCR.storedObject`}, 
 * that provides a single service, {@link yaacovCR.storedObject.ycr$StoredObject `ycr$StoredObject`}, that can be
 * used to create many objects of type {@link yaacovCR.storedObject.type:StoredObject `StoredObject`} containing built-in
 * methods used to interact with HTML5 storage.
 * 
 * The best of {@link https://docs.angularjs.org/api/ngResource/service/$resource ngResource},
 * {@link https://github.com/gsklee/ngStorage ngStorage} and {@link https://github.com/grevory/angular-local-storage
 * angular-local-storage} are combined to give you access to local and session storage within Angular, also providing
 * a storage strategy that supports sharing sessionStorage data between multiple tabs via {@link
 * http://stackoverflow.com/questions/20325763/browser-sessionstorage-share-between-tabs transient} {@link
 * http://blog.guya.net/2015/06/12/sharing-sessionstorage-between-tabs-for-secure-multi-tab-authentication/ localStorage}
 * use.
 * 
 * The {@link https://github.com/yaacovCR/angular-stored-object/blob/master/README.md README} on
 * {@link https://github.com/yaacovCR/angular-stored-object Github} contains a practical example.
 * 
 */

/**
 * @ngdoc overview
 * @name yaacovCR.storedObject
 * @description
 *
 * The `yaacovCR.storedObject` module provides interaction support with HTML5
 * storage objects via the ycr$StoredObject service.
 * 
 * See {@link yaacovCR.storedObject.ycr$StoredObject `ycr$StoredObject`} for usage.
 *
 */
  
  angular
    .module('yaacovCR.storedObject', [])
    .factory('ycr$StoredObject', StoredObjectService);

  /**
   * @ngdoc function
   * @name yaacovCR.storedObject.ycr$StoredObject
   * @description
   *
   * The `ycr$StoredObject` service consists of a "class" object, (i.e. a constuctor
   * function) which, when instantiated (i.e. when called via new), returns a new
   * object instance of type {@link yaacovCR.storedObject.type:StoredObject
   * StoredObject} that will be stored using the key provided during instantiation.
   *  
   * Requires the {@link yaacovCR.storedObject `yaacovCR.storedObject`} module to be
   * installed.
   *
   * @constructor
   * @param {string} key A unique key under which the object instance will be stored.
   * @returns {Object} An object instance of type
   *   {@link yaacovCR.storedObject.type:StoredObject `StoredObject`} with built-in
   *   methods that can be used to interact with HTML5 storage.
   * 
   *   Properties of the object can be set just as with any other Javascript object.
   *   If an object with the same key has been saved to storage by this or any other
   *   tab, the returned object will be loaded from storage and will contain the
   *   properties that were initially set; otherwise, the object will have no
   *   properties besides the built-in methods.
   * 
   * @example
   * <pre>
   *   var session = new ycr$StoredObject('session');
   *   session.token = 'ABCDEFG';
   *   session.$create('localStorage');
   * </pre>
   */
    
  function StoredObjectService($window, $rootScope, $log) {

    /**
     * @ngdoc object
     * @name yaacovCR.storedObject.type:StoredObject
     * @description
     *
     * The `StoredObject` class object provides built-in methods that can be used by
     * an object instance to interact with HTML5 storage.
     * 
     * Properties of the object can be set just as with any other Javascript object.
     * If an object with the same key has been saved to storage by this or any other
     * tab, the new object will be loaded from storage and will contain the
     * properties that were initially set; otherwise, the object will have no
     * properties besides the built-in methods.
     * 
     */
    
    function StoredObject(_key) {
      
      this.$create = $create;
      this.$update = $update;
      this.$delete = $delete;
      
      var _storageStrategy = null;
      var _storageType = null;
      var _timestamp = null;

      var self = this;

      _init();
      
      function _init() {
        _key = 'storedObject:' + _key;
        _addEventHandler();
        if ($window.sessionStorage.getItem(_key) != null || $window.localStorage.getItem(_key) != null) {
          var storageType = ($window.sessionStorage.getItem(_key) != null) ? 'sessionStorage' : 'localStorage';
          _loadIntoMemory(angular.fromJson($window[storageType].getItem(_key)));
        } else {
          _triggerEvent('requested', Date.now());
        }
      }
      
      function _loadIntoMemory(storedObject) {
        if (!storedObject.$storageStrategy) {
          throw new Error('Object with key \'' + _key + '\' found in invalid state, missing \'$storageStrategy\' attribute.');
        }
        if (!storedObject.$timestamp) {
          throw new Error('Object with key \'' + _key + '\' found in invalid state, missing \'$timestamp\' attribute.');
        }
        _storageStrategy = storedObject.$storageStrategy;
        _storageType = (_storageStrategy === 'localStrategy') ? 'localStorage' : 'sessionStorage';
        _timestamp = storedObject.$timestamp;
        delete storedObject.$storageStrategy;
        delete storedObject.$timestamp;
        angular.extend(self, storedObject);
      }
      
      /**
       * @ngdoc function
       * @name yaacovCR.storedObject.type:StoredObject#$create
       * @methodOf yaacovCR.storedObject.type:StoredObject
       * @description
       *
       * The $create method sets the storage strategy for the lifetime of the object (or
       * until the next $delete) and performs the initial persistence to storage.
       * 
       * @param {string} storageStrategy The storage stragegy to use for this object.
       *   Options include:
       * 
       * * `localStorage` - uses HTML5 local storage which will persist beyond the
       * tab lifetime.
       * * `sessionStorage` - uses HTML5 session storage which allows for tab reloading
       * without relogin, but allows access only to the original tab.
       * * `sessionStorageWithMultiTabSupport` - uses sessionStorage for object storage,
       * but also uses localStorage storage events to request and then load the object
       * from other participating tabs' sessionStorage.
       *    
       * @returns {Object} The object instance itself (`this`) to allow for chaining.
       * 
       * @example
       * <pre>
       *   var session = new ycr$StoredObject('session');
       *   session.token = 'ABCDEFG';
       *   $log.debug(session.$create('localStorage').token);
       * </pre>
       */
      
      function $create(storageStrategy) {
        _setup(storageStrategy);
        return this.$update();
      }
      
      /**
       * @ngdoc function
       * @name yaacovCR.storedObject.type:StoredObject#$update
       * @methodOf yaacovCR.storedObject.type:StoredObject
       * @description
       *
       * The $update method persists the object to storage using the storage strategy
       * set by the previous call to $create.
       * 
       * @returns {Object} The object instance itself (`this`) to allow for chaining.
       * 
       * @example
       * <pre>
       *   var session = new ycr$StoredObject('session');
       *   session.token = 'ABCDEFG';
       *   session.$create('localStorage');
       *   session.token = 'HIJKLMN';
       *   session.$update;
       * </pre>
       */
         
      function $update() {
        _updateStorage();
        return this;
      }
      
      /**
       * @ngdoc function
       * @name yaacovCR.storedObject.type:StoredObject#$delete
       * @methodOf yaacovCR.storedObject.type:StoredObject
       * @description
       *
       * The $delete method resets the object and clears it from storage.
       * 
       * @returns {Object} The object instance itself (`this`) to allow for chaining.
       * 
       * @example
       * <pre>
       *   var session = new ycr$StoredObject('session');
       *   session.token = 'ABCDEFG';
       *   session.$create('localStorage');
       *   $log.debug(session);  // contains object with token property
       *   session.$delete;
       *   $log.debug(session);  // contains just the built-in methods
       * </pre>
       */
      function $delete() {
        _removeFromStorage();
        _resetMemory();
        return this;
      }
      
      function _setup(storageStrategy) {
        if (_storageStrategy || _storageType || _timestamp) {
          throw new Error('Object with key \'' + _key + '\' already created.');
        } else if (!storageStrategy) {
          throw new Error('Storage strategy not provided.');
        } else if (!(storageStrategy === 'localStorage' || storageStrategy === 'sessionStorage' || storageStrategy == 'sessionStorageWithMultiTabSupport')) {
          throw new Error('Unsupported storage strategy.');
        }
        _storageStrategy = storageStrategy;
        _storageType = (storageStrategy === 'localStorage') ? 'localStorage' : 'sessionStorage';
        if ($window[_storageType].getItem(_key) != null) {
          throw new Error('Object with key \'' + _key + '\' found in storage.');
        }
      }
      
      function _updateStorage() {
        _timestamp = Date.now();
        var jsonRepresentation = _generateJson();
        $window[_storageType].setItem(_key, jsonRepresentation);
        if (_storageStrategy === 'sessionStorageWithMultiTabSupport') {
          _triggerEvent('updated', jsonRepresentation);
        }
      }
      
      function _generateJson() {
        var storedObject = {
          $storageStrategy: _storageStrategy,
          $timestamp: Date.now()
        };
        angular.forEach(self, function(value, key) {
          storedObject[key] = value;
        });
        return angular.toJson(storedObject);
      }
      
      function _removeFromStorage() {
        if (!_storageStrategy || !_storageType || !_timestamp) {
          throw new Error('Object with key \'' + _key + '\' not found.');
        }
        if ($window[_storageType].getItem(_key) === null) {
          throw new Error('Object with key \'' + _key + '\' not found in storage.');
        }
        $window[_storageType].removeItem(_key);  
        if (_storageStrategy === 'sessionStorageWithMultiTabSupport') {
          _triggerEvent('removed', Date.now());
        }
      }
      
      function _resetMemory() {
        angular.forEach(self, function(value, key) {
          if (!(key.charAt(0) === '$')) {
            delete self[key];
          }
        });
        _storageStrategy = _storageType = _timestamp = null;
      }
      
      function _triggerEvent(name, data) {
        $window.localStorage.setItem(_key + ':' + name, data);
        $window.localStorage.removeItem(_key + ':' + name);
      }
            
      function _addEventHandler() {
        if ($window.addEventListener) {
          $window.addEventListener('storage', _onStorage, false);
        } else {
          $window.attachEvent('onstorage', _onStorage);
        } 
      }
      
      /**
       * @ngdoc event
       * @name yaacovCR.storedObject.type:StoredObject#storedObject꞉key꞉externalChange
       * @eventOf yaacovCR.storedObject.type:StoredObject
       * @description
       *
       * The externalChange event is broadcasted on `$rootScope` when the StoredObject
       * object instance has been changed externally, i.e. via interaction with another tab.
       * 
       * Note that the full event name is `storedObject:key:externalChange`, where key
       * represents the string passed on object instantiation, and storedObject creates a
       * namespace for this module. Regular colons are used as separators.
       * 
       * This event may be fired at start-up if the object is loaded from another tab which
       * is employing the `sessionStorageWithMultiTabSupport` strategy. It may happen at any
       * time thereafter for both the `localStorage` and `sessionStorageWithMultiTabSupport`
       * strategies.
       * 
       * No event is fired when the object has been changed by the current tab, no matter
       * the strategy in use. This is by design, as an event was felt to be unnecessary;
       * whatever service or controller that has been tasked with updating the StoredObject 
       * should be responsible as well for kicking off a response, or firing an event as
       * necessary. External changes, i.e. from another tab, happen outside the Angular
       * context and therefore `$rootScope.$apply` is called to force a digest cycle, which
       * will usually be all that is required.
       * 
       * Sometimes, however, the entire state of the application may be invalidated if the
       * stored object is changed by another tab. It is for these instances that the
       * externalChange is provided. For example, if the session has been stored using this
       * module, if session expiration is communicated by another tab, the current state
       * may  be invalidated. The provided example uses
       * {@link https://github.com/angular-ui/ui-router UI-Router}'s ability to reload the
       * current state to handle this event, which of course presumes that an attempt to
       * change to the given state without a valid session is handled elsewhere.
       * 
       * The
       * {@link https://github.com/yaacovCR/angular-stored-object/blob/master/README.md
       * README} on {@link https://github.com/yaacovCR/angular-stored-object Github}
       * contains a more complete example.
       * 
       * @example
       * <pre>
       *   $rootScope.$on('storedObject:session:externalChange', function() {
       *     $timeout(function() {
       *       $state.reload();
       *     });
       *   }
       * </pre>
       */
        
      function _onStorage(event) {
        var externallyChanged;
        
        if (_storageStrategy != 'sessionStorage') {
          
          if (event.key === _key + ':transferred' && event.newValue) {
            
            if (_storageStrategy === null) {
              _loadIntoMemory(angular.fromJson(event.newValue));
              $window[_storageType].setItem(_key, event.newValue);
              externallyChanged = $rootScope.$broadcast(_key + ':externalChange');
              if (!externallyChanged.defaultPrevented) {
                $rootScope.$apply();
              }
            }
            
          } else if (event.key === _key + ':updated' && event.newValue) {
            
            var storedObject = angular.fromJson(event.newValue);
            if (storedObject.$timestamp > _timestamp) {
              _resetMemory();
              _loadIntoMemory(storedObject);
              if (_storageStrategy === 'sessionStorageWithMultiTabSupport') {
                $window[_storageType].setItem(_key, event.newValue);
              }
              externallyChanged = $rootScope.$broadcast(_key + ':externalChange');
              if (!externallyChanged.defaultPrevented) {
                $rootScope.$apply();
              }
            }
            
          } else if (event.key === _key + ':removed' && event.newValue) {
            
            $window[_storageType].removeItem(_key);
            _resetMemory();
            externallyChanged = $rootScope.$broadcast(_key + ':externalChange');
            if (!externallyChanged.defaultPrevented) {
              $rootScope.$apply();
            }
            
          } else if (event.key === _key + ':requested' && event.newValue) {
            
            if (_storageStrategy === 'sessionStorageWithMultiTabSupport') {
              _triggerEvent('transferred', _generateJson());
            }
            
          }
          
        }
        
      }
      
    }
    
    return StoredObject;
    
  }
  
  StoredObjectService.$inject = ['$window', '$rootScope', '$log'];
  
})(window, window.angular);