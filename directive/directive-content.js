import Directive from "./directive";

//Note: Don't use .html() or .attr() jquery. It's weird with different types.
export default Directive.extend({
    name:"content",
    build:function(){
        if (this.$el.prop("tagName")=="IMG") this.el.setAttribute("title",this.result)
        else this.el.innerHTML = this.result;
    },
    render:function(){
        this.build();
    },
    test:function(value){
        var pass = false;
        if (this.$el.prop("tagName")=="IMG") {
            if (this.el.getAttribute("title")==value + "") pass = true;
        }
        else if (this.el.innerHTML==value+"") pass = true;
        
        return pass;
    }
});