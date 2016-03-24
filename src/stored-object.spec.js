(function(window, angular, undefined) {'use strict';
  
  var supportedStorageTypes = ['localStorage', 'sessionStorage']; 
  var supportedStorageStrategies = ['localStorage', 'sessionStorage', 'sessionStorageWithMultiTabSupport'];

  describe('StoredObject', function() {
    var $window;
    var StoredObject;
    
    beforeEach(function() {
      module('yaacovCR.storedObject');
      module(['$provide', function($provide) {
        $provide.value('$window', $window);
      }]);
    });
    
    it('defines a StoredObject service', inject(function(ycr$StoredObject) {
      expect(ycr$StoredObject).toBeDefined();
    }));
    
    describe('which generates an object', function() {
      var $rootScope;
      var testObject;
      
      function resetTestObject(initialStore, preventDefault) {
        resetWindowService(
          (initialStore && initialStore.sessionStorageWithMultiTabSupport) ? initialStore.sessionStorageWithMultiTabSupport : null);
        
        supportedStorageStrategies.forEach(function(storageStrategy) {
          if (storageStrategy != 'sessionStorageWithMultiTabSupport') {
            if (initialStore && initialStore[storageStrategy]) {
              addInitialStore(storageStrategy, initialStore[storageStrategy]);
            }
          }
        });
        
        inject(function(_$rootScope_, _ycr$StoredObject_) {
          $rootScope = _$rootScope_;
          StoredObject = _ycr$StoredObject_;
        });
                
        spyOn($window.localStorage, 'setItem').and.callThrough();
        spyOn($rootScope, '$broadcast').and.returnValue({ defaultPrevented: preventDefault });
        spyOn($rootScope, '$apply').and.callThrough();
                
        testObject = new StoredObject('testObject')
        
        return testObject;
      }
      
      function resetWindowService(otherTabValue) {
        $window = {
          eventHandlers: {},
          otherTabValue: otherTabValue,
          addEventListener: function(event, handler) {
            this.eventHandlers[event] = handler;
          },
          triggerStorageEvent: function(key, oldValue, newValue) {
            if (this.eventHandlers.storage) {
              this.eventHandlers.storage({
                key: key,
                oldValue: oldValue,
                newValue: newValue
              });
            }
          }
        };
        
        supportedStorageTypes.forEach(function(storageType) {
          $window[storageType] = {
            data: {},
            getItem: function(key) { return this.data[key]; },
            setItem: function(key, value) {
              var oldValue = (this.data[key]) ? this.data[key] : null;
              this.data[key] = value;
              $window.triggerStorageEvent(key, oldValue, value);
              if ($window.otherTabValue) {
                if (key === 'storedObject:testObject:requested' && value) {
                  $window.localStorage.setItem(
                    'storedObject:testObject:transferred',
                    generateJson('sessionStorageWithMultiTabSupport', $window.otherTabValue)
                  );
                  $window.localStorage.removeItem('storedObject:testObject:transferred');
                }
              }
            },
            removeItem: function(key) {
              var oldValue = this.data[key];
              delete this.data[key];
              $window.triggerStorageEvent(key, oldValue, null);
            }
          };
        });
      }
      
      function addInitialStore(storageStrategy, testPropertyValue) {
        $window[storageStrategy].data = {
          'storedObject:testObject': generateJson(storageStrategy, testPropertyValue)
        }
      }
      
      function generateJson(storageStrategy, testPropertyValue) {
        return angular.toJson({
          $storageStrategy: storageStrategy,
          $timestamp: Date.now(),
          testProperty: testPropertyValue
        });
      }
      
      describe('that returns a new empty object when the store is empty', function() {
        it('does not throw', function() {
          expect(resetTestObject).not.toThrow();
        });
        it('and is truthy, but empty', function() {
          testObject = resetTestObject()
          expect(testObject).toBeTruthy();
          expect(testObject.testProperty).toBeUndefined();
        });
      });
      
      describe('and automatically gets value if possible at start-up', function() {
        supportedStorageStrategies.forEach(function(storageStrategy) {
          var initialStore = {};
          initialStore[storageStrategy] = 'testValue';
          if (storageStrategy === 'sessionStorageWithMultiTabSupport') {
            [false, true].forEach(function(preventDefault) {
              it('using ' + storageStrategy + ((preventDefault) ? ' ' : ' not ') + 'preventing default', function() {
                testObject = resetTestObject(initialStore, preventDefault);
                expect(testObject.testProperty).toBe('testValue');
                expect($window.localStorage.setItem.calls.first().args).toEqual(
                  jasmine.arrayContaining(['storedObject:testObject:requested']));
                expect($window.localStorage.setItem.calls.mostRecent().args).toEqual(
                  jasmine.arrayContaining(['storedObject:testObject:transferred']));
                expect($rootScope.$broadcast.calls.count()).toBe(1);
                expect($rootScope.$broadcast).toHaveBeenCalledWith('storedObject:testObject:externalChange');
                expect($rootScope.$apply.calls.count()).toBe((preventDefault) ? 0 : 1);
              });              
            });
          } else {
            it('using ' + storageStrategy, function() {
              testObject = resetTestObject(initialStore);
              expect(testObject.testProperty).toBe('testValue');
              expect($window.localStorage.setItem.calls.count()).toBe(0);
              expect($rootScope.$broadcast.calls.count()).toBe(0);
            });            
          }
        });
      });

      describe('and prioritizes sessionStorage', function() {
        it('over localStorage', function() {
          testObject = resetTestObject({
            sessionStorage: 'sessionStorageRocks',
            localStorage: 'localStorageRules'
          });
          expect(testObject.testProperty).toBe('sessionStorageRocks');
        });
        
        it('and over other tab\'s sessionStorage', function() {
          testObject = resetTestObject({
            sessionStorage: 'thisSessionStorageRocks',
            sessionStorageWithMultiTabSupport: 'theOtherSessionStorageRules'
          });
          expect(testObject.testProperty).toBe('thisSessionStorageRocks');
        });
      });
      
      supportedStorageStrategies.forEach(function(storageStrategy) {
        describe('and supports ' + storageStrategy, function() {
          var storageType = (storageStrategy === 'localStorage') ? 'localStorage' : 'sessionStorage';
          
          beforeEach(function() {
            testObject = resetTestObject();
            testObject.testProperty = 'testValue';
          });
          
          it('with storage object creation via $create', function() {
            var callCount = $window.localStorage.setItem.calls.count();
            testObject.$create(storageStrategy);
            if (storageStrategy === 'sessionStorageWithMultiTabSupport') {
              expect($window.localStorage.setItem.calls.mostRecent().args).toEqual(
                jasmine.arrayContaining(['storedObject:testObject:updated']));
            } else if (storageStrategy === 'localStorage') {
              expect($window.localStorage.setItem.calls.count()).toBe(callCount + 1);
              expect($window.localStorage.setItem.calls.mostRecent().args).not.toEqual(
                jasmine.arrayContaining(['storedObject:testObject:updated']));
            } else {
              expect($window.localStorage.setItem.calls.count()).toBe(callCount);
            }
            expect(angular.fromJson($window[storageType].data['storedObject:testObject'])).toEqual(jasmine.objectContaining({
              $storageStrategy: storageStrategy,
              testProperty: 'testValue'
            }));
          });

          it('with storage object modification via $update', function() {
            testObject.$create(storageStrategy);
            testObject.testProperty = 'testValue2';
            expect(angular.fromJson($window[storageType].data['storedObject:testObject'])).toEqual(jasmine.objectContaining({
              $storageStrategy: storageStrategy,
              testProperty: 'testValue'
            }));
            var callCount = $window.localStorage.setItem.calls.count();
            testObject.$update();
            if (storageStrategy === 'sessionStorageWithMultiTabSupport') {
              expect($window.localStorage.setItem.calls.mostRecent().args).toEqual(
                jasmine.arrayContaining(['storedObject:testObject:updated']));
            } else if (storageStrategy === 'localStorage') {
              expect($window.localStorage.setItem.calls.count()).toBe(callCount + 1);
              expect($window.localStorage.setItem.calls.mostRecent().args).not.toEqual(
                jasmine.arrayContaining(['storedObject:testObject:updated']));
            } else {
              expect($window.localStorage.setItem.calls.count()).toBe(callCount);
            }
            expect(angular.fromJson($window[storageType].data['storedObject:testObject'])).toEqual(jasmine.objectContaining({
              $storageStrategy: storageStrategy,
              testProperty: 'testValue2'
            }));
          });

          it('with storage object deletion via $delete', function() {
            testObject.$create(storageStrategy);
            var callCount = $window.localStorage.setItem.calls.count(); 
            testObject.$delete();
            if (storageStrategy === 'sessionStorageWithMultiTabSupport') {
              expect($window.localStorage.setItem.calls.mostRecent().args).toEqual(
                jasmine.arrayContaining(['storedObject:testObject:removed']));
            } else {
              expect($window.localStorage.setItem.calls.count()).toBe(callCount);
            }
            expect($window[storageType].data['storedObject:testObject']).toBeUndefined();
          });
        });
      });
      
      describe('and responds appropriately if another tab calls $create via storedObject:testObject:updated event', function() {
        [false, true].forEach(function(preventDefault) {
          it('with localStorage strategy,' + ((preventDefault) ? ' ' : ' not ') + 'preventing default', function() {
            testObject = resetTestObject(null, preventDefault);
            $window.triggerStorageEvent(
              'storedObject:testObject:updated',
              null,
              generateJson('localStorage', 'testValue'));
            expect(testObject.testProperty).toBe('testValue');
            expect($rootScope.$broadcast.calls.count()).toBe(1);
            expect($rootScope.$broadcast).toHaveBeenCalledWith('storedObject:testObject:externalChange');
            expect($rootScope.$apply.calls.count()).toBe((preventDefault) ? 0 : 1);
          });
        });
        
        [false, true].forEach(function(preventDefault) {
          it('with sessionStorageWithMultiTabSupport strategy,' + ((preventDefault) ? ' ' : ' not ') + 'preventing default', function() {
            testObject = resetTestObject(null, preventDefault);
            $window.triggerStorageEvent(
              'storedObject:testObject:updated',
              null,
              generateJson('sessionStorageWithMultiTabSupport', 'testValue'));
            expect(testObject.testProperty).toBe('testValue');
            expect(angular.fromJson($window.sessionStorage.data['storedObject:testObject'])).toEqual(jasmine.objectContaining({
              $storageStrategy: 'sessionStorageWithMultiTabSupport',
              testProperty: 'testValue'
            }));
            expect($rootScope.$broadcast.calls.count()).toBe(1);
            expect($rootScope.$broadcast).toHaveBeenCalledWith('storedObject:testObject:externalChange');
            expect($rootScope.$apply.calls.count()).toBe((preventDefault) ? 0 : 1);
          });
        });
      });

      describe('and responds appropriately if another tab calls $update via storedObject:testObject:updated event', function() {
        [false, true].forEach(function(preventDefault) {
          it('with localStorage strategy,' + ((preventDefault) ? ' ' : ' not ') + 'preventing default', function(done) {
            testObject = resetTestObject(null, preventDefault);
            testObject.testProperty = 'testValue';
            testObject.$create('localStorage');
            setTimeout(function() {
              var broadcastCount = $rootScope.$broadcast.calls.count();
              var applyCount = $rootScope.$apply.calls.count();
              $window.triggerStorageEvent(
                'storedObject:testObject:updated',
                null,
                generateJson('localStorage', 'testValue2'));
              expect(testObject.testProperty).toBe('testValue2');
              expect($rootScope.$broadcast.calls.count()).toBe(broadcastCount + 1);
              expect($rootScope.$broadcast.calls.mostRecent().args).toEqual(
                jasmine.arrayContaining(['storedObject:testObject:externalChange']));          
              expect($rootScope.$apply.calls.count()).toBe((preventDefault) ? applyCount : applyCount + 1);
              done();
            }, 1);
          });
        });
        
        [false, true].forEach(function(preventDefault) {
          it('with sessionStorageWithMultiTabSupport strategy,' + ((preventDefault) ? ' ' : ' not ') + 'preventing default', function(done) {
            testObject = resetTestObject(null, preventDefault);
            testObject.testProperty = 'testValue';
            testObject.$create('sessionStorageWithMultiTabSupport');
            setTimeout(function() {
              var broadcastCount = $rootScope.$broadcast.calls.count();
              var applyCount = $rootScope.$apply.calls.count();
              $window.triggerStorageEvent(
                'storedObject:testObject:updated',
                null,
                generateJson('sessionStorageWithMultiTabSupport', 'testValue2'));
              expect(testObject.testProperty).toBe('testValue2');
              expect(angular.fromJson($window.sessionStorage.data['storedObject:testObject'])).toEqual(jasmine.objectContaining({
                $storageStrategy: 'sessionStorageWithMultiTabSupport',
                testProperty: 'testValue2'
              }));
              expect($rootScope.$broadcast.calls.count()).toBe(broadcastCount + 1);
              expect($rootScope.$broadcast.calls.mostRecent().args).toEqual(
                jasmine.arrayContaining(['storedObject:testObject:externalChange']));          
              expect($rootScope.$apply.calls.count()).toBe((preventDefault) ? applyCount : applyCount + 1);
              done();
            }, 1);
          });
        });
      });

      describe('and responds appropriately if another tab calls $delete via storedObject:testObject:removed event', function() {
        [false, true].forEach(function(preventDefault) {
          it('with localStorage strategy,' + ((preventDefault) ? ' ' : ' not ') + 'preventing default', function() {
            testObject = resetTestObject(null, preventDefault);
            testObject.testProperty = 'testValue';
            testObject.$create('localStorage');
            var broadcastCount = $rootScope.$broadcast.calls.count();
            var applyCount = $rootScope.$apply.calls.count();
            $window.triggerStorageEvent('storedObject:testObject:removed', null, Date.now());
            expect(testObject.testProperty).toBeUndefined();
            expect($rootScope.$broadcast.calls.count()).toBe(broadcastCount + 1);
            expect($rootScope.$broadcast.calls.mostRecent().args).toEqual(
              jasmine.arrayContaining(['storedObject:testObject:externalChange']));          
            expect($rootScope.$apply.calls.count()).toBe((preventDefault) ? applyCount : applyCount + 1);
          });
        });
        
        [false, true].forEach(function(preventDefault) {
          it('with sessionStorageWithMultiTabSupport strategy,' + ((preventDefault) ? ' ' : ' not ') + 'preventing default', function() {
            testObject = resetTestObject(null, preventDefault);
            testObject.testProperty = 'testValue';
            testObject.$create('sessionStorageWithMultiTabSupport');
            var broadcastCount = $rootScope.$broadcast.calls.count();
            var applyCount = $rootScope.$apply.calls.count();
            $window.triggerStorageEvent('storedObject:testObject:removed', null, Date.now());
            expect(testObject.testProperty).toBeUndefined();
            expect($window.sessionStorage.data['storedObject:testObject']).toBeUndefined();
            expect($rootScope.$broadcast.calls.count()).toBe(broadcastCount + 1);
            expect($rootScope.$broadcast.calls.mostRecent().args).toEqual(
              jasmine.arrayContaining(['storedObject:testObject:externalChange']));          
            expect($rootScope.$apply.calls.count()).toBe((preventDefault) ? applyCount : applyCount + 1);
          });
        });
      });
      
      it('responds appropriately to other tabs\' requests in sessionStorageWithMultiTabSupport mode', function() {
        testObject = resetTestObject();
        testObject.$create('sessionStorageWithMultiTabSupport');
        $window.triggerStorageEvent('storedObject:testObject:requested', null, Date.now());
        expect($window.localStorage.setItem.calls.mostRecent().args).toEqual(
          jasmine.arrayContaining(['storedObject:testObject:transferred']));
      });
            
      it('has a $debug function that calls $log.debug', inject(function($log) {
        testObject = resetTestObject();
        testObject.testProperty = 'testValue';
        spyOn($log, 'debug').and.callThrough();
        testObject.$debug('localStorage');
        expect($log.debug).toHaveBeenCalledWith(testObject);
      }));

      it('has a $save function that just calls $update', function() {
        testObject = resetTestObject();
        testObject.testProperty = 'testValue';
        testObject.$create('localStorage');
        spyOn(testObject, '$update').and.callThrough();
        testObject.$save();
        expect(testObject.$update).toHaveBeenCalled();
      });

      it('has a $remove function that just calls $delete', function() {
        testObject = resetTestObject();
        testObject.testProperty = 'testValue';
        testObject.$create('localStorage');
        spyOn(testObject, '$delete').and.callThrough();
        testObject.$remove();
        expect(testObject.$delete).toHaveBeenCalled();
      });
      
    });

  });
  
})(window, window.angular);