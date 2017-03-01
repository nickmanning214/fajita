import Directive from "./directive";

export default Directive.extend({
    name:"href",
   
    build:function(){
        if (this.$el.prop("tagName")=="A") this.$el.attr("href",this.result);
        else {
            var a = document.createElement("a");
            a.classList.add("wrapper-a")
            a.setAttribute("href",this.result);
            this.wrapperA = a;
            this.el.parentNode.replaceChild(this.wrapperA,this.el)
            //can't simply use this.$el.wrap(a);
            //http://stackoverflow.com/questions/5707328/wrap-one-element-with-another-retaining-reference-to-wrapper
            this.wrapperA.appendChild(this.el);
        }
        window.wrapperA = this.wrapperA;
    },
    render:function(){
        if (this.$el.prop("tagName")=="A") $(this.el).attr("href",this.result)
        else {
            this.wrapperA.setAttribute("href",this.result);
        }
    },
    test:function(value){
        if (this.$el.prop("tagName")=="A") return $(this.el).attr("href")==value
        else {
            return $(this.el).parent().prop("tagName")=="A" && $(this.el).parent().attr("href")==value
        }
    }
});