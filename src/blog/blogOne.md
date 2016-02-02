
{{blogs.one.title}}
===

We almost always use $http inside a service, because services are where we deal with stuff that can be shared throughout the app (like data from an API). But usually when we get a response back, a controller needs to know about it. So how do we get this asynchronous response back to the controller?

#### The Problem

Let's say when a button is clicked, our controller needs to update the view with fresh information from our clogs API, and our ClogsService needs to store this new information so other controllers can use it.

#### The typical method - .then()

The $http function returns a promise, which has a .then() method which will be called in the controller when a response comes back from our API. Like so:

```javascript
app.controller('DisplayController', ['$scope', 'ClogsService', function($scope, ClogsService){
  $scope.clogs = [];
  $scope.getClogs = function() {
    ClogService.getClogs()
      .then(function(response){
        ClogsService.clogs = response.data;
          $scope.clogs = ClogsService.clogs;
      });
    };
})

app.service('ClogsService', ['$http', function($http){
  this.clogs = [];
  this.getClogs = function(){
    return $http.get('/API/clogs');
  };
}]);
```


Good enough. Our service makes the $http request, and our controller is able to update both $scope and the ClogsService. But there are some issues with this method. Ideally, all the data management would happen in the service, not the controller. We want to keep our controller skinny!

#### A better way - $watch

In this approach, we put response handling in the service and ask the controller to watch the service for changes so it knows when to update the scope. Angular already has a way to watch scoped variables for change: $scope.$watch. But we want to watch the *service*. So what do we do? How about this:

```JavaScript
app.controller('DisplayController', ['$scope', 'ClogsService', function($scope, ClogsService){
  $scope.clogs = [];
  $scope.clogWatcher = function(){ return ClogsService.clogs };
  $scope.$watch('clogWatcher', function(newClogs){ $scope.clogs = newClogs }, true);
})
app.service('ClogsService', ['$http', function($http){
  this.clogs = [];
  this.getClogs = () => {
    $http.get('/API/clogs')
      .then((response) => {
        this.clogs = response.data;
      });
  };
}]);
```

This is an improvement. We put a function on the scope that returns the service property we want to watch: clogs. Now we can $watch this function for changes, and update $scope.clogs when it does. In this way, we avoid putting the whole ClogsService on the scope in order to watch it. Remember, putting things on the scope is costly, because it gets checked during Angular's digest cycle.

There is the added benefit that *any* controller can watch the service and update it's scope on a change.

But this method is not perfect. Putting the clogWatcher function on the scope is kinda awkward, especially if we're not using it explicitly in the view.

PS: The last argument in $watch, "true," tells watch to check whatever it is watching for equivalence, not just reference

#### Getting fancy - Event Emitters

Coming soon ...
