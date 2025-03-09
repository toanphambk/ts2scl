import { BOOL, Input, INT, Output, SCLFB, Static } from './decorators';
import { TIME, SCLCategory } from './types';

// "R_TRIG_DB"(CLK := "TagIn",
// Q => "TagOut");

@SCLFB()
export class R_TRIG_DB {
    static exec(
        @Input({}) CLK: BOOL,
        @Output({}) Q: BOOL
    ): void { }
}


// "F_TRIG_DB"(CLK := "TagIn",
// Q => "TagOut");

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

@SCLFB()
export class TP {
    public exec(
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
@SCLFB()
export class TON {
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
@SCLFB()
export class TOF {
    public TOF(
        @Input({}) IN: BOOL,
        @Input({}) PT: TIME,
        @Output({}) Q?: BOOL,
        @Output({}) ET?: TIME
    ): void { }
}

SCLFB
export class TONR {
    public TONR(
        @Input({}) IN: BOOL,
        @Input({}) PT: TIME,
        @Output({}) Q?: BOOL,
        @Output({}) ET?: TIME
    ): void { }
}



@SCLFB()
export class RESET_TIMER {
    public RESET_TIMER(
        @Input({}) IN: TON | TOF | TP | TONR | TOF,
    ): void { }
}






