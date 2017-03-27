/*import _ from "underscore";*/
/*import Backbone from "backbone";*/


export default Backbone.Model.extend({
  
  initialize:function(options){
    if ( typeof URLSearchParams !== "undefined" ){
      this.query = new URLSearchParams(window.location.search);
    }

    //possibly deprecated because if subModels and subCollections are separated then how to you ref them in get id there is a name conflict?
    this.subModels = {};
    this.subCollections = {};

    //new
    this.structure = {};

    this.parentModels = [];
    this.init();
  },
  init:function(){},
  registerSubCollection:function(prop,collection){
    if (_.isArray(collection)) collection = new Base.Collection(collection);
    else if (!(collection instanceof Backbone.Collection)) collection = new Base.Collection(_.toArray(collection))
    this.subCollections[prop] = collection;
    collection.parentModels.push(this);
    this.listenTo(collection,"add remove reset sort",function(){
      this.trigger("change");
    })
  },
  get:function(attr){
    if (_.isString(attr) && attr.startsWith("->")) {
      return this.structure[attr.substr(2)];
    }
    else{
      var get = Backbone.Model.prototype.get.apply(this,arguments);
      if (!_.isUndefined(get)) return get;

      var props = attr.split(".");
        if (props.length > 1){
          var model = this;
          props.forEach(function(prop){
            if (model.subModels[prop]) model = model.subModels[prop];
            else if (model.subCollections[prop]) model = model.subCollections[prop]
          })
          return model;   
        }
    
        return this.subModels[attr] || this.subCollections[attr]
    }

   
   
  },
  toggle:function(key,val1,val2){
    if (this.get(key)==val2){
      this.set(key,val1);
    }
    else this.set(key,val2);
  },
  set:function(key, val, options){
      //my code
      if (_.isString(key) && key.startsWith("->")) {

        var modelOrCollection = (_.isArray(val))?new Fajita.Collection(val):new Fajita.Model(val);
        modelOrCollection.parentModels.push(this);
        this.structure[key.substr(2)] = modelOrCollection;
        
        
        this.listenTo(modelOrCollection,"change add",function(modelOrCollection,options){

            this.trigger("change");
            
            /* TODO: invent entire system for traversing and firing events. Probably not worth the effort for now.
            Object.keys(model.changedAttributes()).forEach(function(key){
              this.trigger("change:"+prop+"."+key)
            }.bind(this));
            */


          });

       
      }
      else {
        Backbone.Model.prototype.set.call(this,...arguments);
      }
      
     
  }
  //Note: there is still no listener for a submodel of a collection changing, triggering the parent. I think that's useful.
});