import Directive from "./directive";

export default Directive.extend({
    name:"src",
    build:function(){
        this.$el.attr("src",this.result);
    },
    render:function(){
        this.$el.attr("src",this.result);
    },
    test:function(value){
        return this.$el.attr("src")===value;
    }
});