import _ from "underscore";
import Backbone from "backbone";


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
  registerSubModel:function(prop,model){
    this.subModels[prop] = model;
    model.parentModels.push(this);

    this.listenTo(model,"change",function(model,options){
      
      this.trigger("change");
      
      /* TODO: invent entire system for traversing and firing events. Probably not worth the effort for now.
      Object.keys(model.changedAttributes()).forEach(function(key){
        this.trigger("change:"+prop+"."+key)
      }.bind(this));
      */


    });
  },
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
  
  set:function(key, val, options){
      //my code
      if (_.isString(key) && key.startsWith("->")) {
        if (_.isArray(val)) this.structure[key.substr(2)] = new Fajita.Collection(val)
        else if (_.isObject(val)) this.structure[key.substr(2)] = new Fajita.Model(val);
      }
      else {
        Backbone.Model.prototype.set.call(this,...arguments);
      }
      
     
  }
  //Note: there is still no listener for a submodel of a collection changing, triggering the parent. I think that's useful.
});