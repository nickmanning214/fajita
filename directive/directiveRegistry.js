import DirectiveContent from "./directive-content";
import DirectiveEnable from "./directive-enable";
import DirectiveDisable from "./directive-disable";
import DirectiveHref from "./directive-href";
import DirectiveMap from "./directive-map";
import DirectiveOptional from "./directive-optional";
import DirectiveOptionalWrap from "./directive-optionalwrap";
import DirectiveSrc from "./directive-src";
import DirectiveSubview from "./directive-subview";
import DirectiveData from "./directive-data";

var registry = {
    Content:DirectiveContent,
    Enable:DirectiveEnable,
    Disable:DirectiveDisable,
    Href:DirectiveHref,
    Map:DirectiveMap,
    Optional:DirectiveOptional,
    OptionalWrap:DirectiveOptionalWrap,
    Src:DirectiveSrc,
    Subview:DirectiveSubview,
    Data:DirectiveData
};

export default registry;