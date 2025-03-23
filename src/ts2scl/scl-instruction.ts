
import { Input, Output, SCLFb, SCLFc } from "./core/types/decorators";
import { BOOL, TIME } from "./core/types/types";


// "R_TRIG_DB"(CLK := "TagIn",
// Q => "TagOut");
@SCLFb({ sclInstruction: 'R_TRIG' })
export class R_TRIG_DB {
    static exec(
        @Input({}) CLK: BOOL,
        @Output({}) Q: BOOL
    ): void { }
}


// "F_TRIG_DB"(CLK := "TagIn",
// Q => "TagOut");

@SCLFb({ sclInstruction: 'F_TRIG' })
export class F_TRIG_DB {
    static exec(
        @Input({}) CLK: BOOL,
        @Output({}) Q: BOOL
    ): void { }
}



// "TP_DB".TP(IN := "Tag_Start",
// PT := "Tag_PresetTime",
// Q => "Tag_Status",
// ET => "Tag_ElapsedTime");

@SCLFb({ sclInstruction: 'IEC_TIMER' })
export class TP_TIME {
    public TP(
        @Input({}) IN: BOOL,
        @Input({}) PT: TIME,
        @Output({}) Q?: BOOL,
        @Output({}) ET?: TIME
    ): void { }
}

// "TON_DB".TON(IN := "Tag_Start",
// PT := "Tag_PresetTime",
// Q => "Tag_Status",
// ET => "Tag_ElapsedTime");
@SCLFb({ sclInstruction: 'IEC_TIMER' })
export class TON_TIME {
    public TON(
        @Input({}) IN: BOOL,
        @Input({}) PT: TIME,
        @Output({}) Q?: BOOL,
        @Output({}) ET?: TIME
    ): void { }
}

// "TOF_DB".TOF(IN := "Tag_Start",
// PT := "Tag_PresetTime",
// Q => "Tag_Status",
// ET => "Tag_ElapsedTime");
@SCLFb({ sclInstruction: 'IEC_TIMER' })
export class TOF_TIME {
    public TOF(
        @Input({}) IN: BOOL,
        @Input({}) PT: TIME,
        @Output({}) Q?: BOOL,
        @Output({}) ET?: TIME
    ): void { }
}

@SCLFb({ sclInstruction: 'IEC_TIMER' })
export class TONR_TIME {
    public TONR(
        @Input({}) IN: BOOL,
        @Input({}) PT: TIME,
        @Output({}) Q?: BOOL,
        @Output({}) ET?: TIME
    ): void { }
}



@SCLFc({ sclInstruction: 'RESET_TIMER' })
export class RESET_TIMER {
    public static exec(
        @Input({}) TIMER: TON_TIME | TOF_TIME | TP_TIME | TONR_TIME | TOF_TIME,
    ): void { }
}

