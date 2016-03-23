(function(window, angular, undefined) {'use strict';

/**
 * @ngdoc overview
 * @name yaacovCR.storedObject
 * @description
 *
 * # yaacovCR.storedObject
 *
 * The `yaacovCR.storedObject` module provides interaction support with HTML5
 * storage objects via the ycr$StoredObject service.
 *
 */
  
  angular
    .module('yaacovCR.storedObject', [])
    .factory('ycr$StoredObject', StoredObjectService);
    
  function StoredObjectService($window, $rootScope, $log) {
    
    function StoredObject(_key) {
      
      this.$create = $create;
      this.$debug = $debug;
      this.$save = function() { this.$update(); };
      this.$update = $update;
      this.$remove = function() { this.$delete(); };
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
      
      function $create(storageStrategy) {
        _setup(storageStrategy);
        return this.$update();
      }
      
      function $debug() {
        $log.debug(this);
        return this;
      }
      
      function $update() {
        _updateStorage();
        return this;
      }
      
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