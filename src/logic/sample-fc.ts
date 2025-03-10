import { SCLType, SCLFn, Input, Output, Instance } from "../ts2scl/core/types/decorators";
import { BOOL, INT, WORD, REAL, TIME, STRING } from "../ts2scl/core/types/types";
import { DriveController, DriveControllerInput, DriveControllerOutput } from "./sample-fb";


/**
 * Input type for DriveCalculateSpeed function
 */
@SCLType()
export class DriveCalcSpeedInput {
  enable: BOOL;
  targetSpeed: INT;
  status: WORD;
}

/**
 * Output type for DriveCalculateSpeed function
 */
@SCLType()
export class DriveCalcSpeedOutput {
  calculatedSpeed: INT;
  isRunning: BOOL;
}

/**
 * Input type for DriveControl function
 */
@SCLType()
export class DriveControlInput {
  enable: BOOL;
  setSpeed: INT;
}

/**
 * Output type for DriveControl function
 */
@SCLType()
export class DriveControlOutput {
  driveStatus: WORD;
  actualSpeed: INT;
}

// Example of a Function (FC) - Pure function with no /instance data
@SCLFn()
export class DriveCalculateSpeed {
  public static exec(
    @Input({}) input: DriveCalcSpeedInput,
    @Output({}) output: DriveCalcSpeedOutput
  ): INT {
    // Declare local variables (these will be generated as temp variables)
    let tempStatusWord: WORD = 0x0000;  // Initialize with zero
    let tempCalcSpeed: INT = 100;  // Default speed value

    output.isRunning = false;

    // Assign input // Initial state with direct value assignments status
    tempStatusWord = input.status;

    if (!input.enable) {
      output.calculatedSpeed = 0;
      return 0;
    }

    // Direct value assignments for different status conditions
    if (tempStatusWord === 0x0003) {
      if (input.targetSpeed > 1000) {
        tempCalcSpeed = 50;      // Fixed safe speed
        output.isRunning = false;
      } else {
        tempCalcSpeed = 100;     // Minimum operating speed
        output.isRunning = true;
      }
    } else if (tempStatusWord === 0x0004) {
      if (input.targetSpeed > 2000) {
        tempCalcSpeed = 800;     // Fixed high speed limit
        output.isRunning = true;
      } else {
        tempCalcSpeed = 500;     // Fixed normal speed
        output.isRunning = true;
      }
    } else if (tempStatusWord === 0x0008) {
      if (input.targetSpeed > 3000) {
        tempCalcSpeed = 600;     // Maintenance high limit
        output.isRunning = true;
      } else if (input.targetSpeed > 2000) {
        tempCalcSpeed = 500;     // Maintenance medium limit
        output.isRunning = true;
      } else {
        tempCalcSpeed = 300;     // Maintenance low limit
        output.isRunning = true;
      }
    } else {
      if (input.targetSpeed > 4000) {
        tempCalcSpeed = 3200;    // Maximum allowed speed
        output.isRunning = true;
      } else {
        tempCalcSpeed = input.targetSpeed;
        output.isRunning = true;
      }
    }

    output.calculatedSpeed = tempCalcSpeed;
    return tempCalcSpeed;
  }
}

// Another example of a Function (FC)
@SCLFn()
export class DriveControl {
  @Instance('multiple')
  public static motorA: DriveController

  @Instance('multiple')
  public static motorB: DriveController

  public static exec(
    @Input({}) input: DriveControlInput,
    @Output({}) output: DriveControlOutput
  ): INT {
    let tempDriveStatus: WORD = 0x0000;
    let tempResult: INT = 0;
    let calculatedSpeed: INT = 0;
    let calcSpeedInput: DriveControllerInput = {} as DriveControllerInput;
    calcSpeedInput.enable = input.enable;
    calcSpeedInput.targetSpeed = input.setSpeed;
    calcSpeedInput.parameters = 0;
    calcSpeedInput.safetyEnabled = false;
    calcSpeedInput.speedLimits = [];

    let calcSpeedOutput: DriveControllerOutput = {} as DriveControllerOutput;
    calcSpeedOutput.status = 0;
    calcSpeedOutput.errorStatus = 0;
    calcSpeedOutput.actualSpeed = 0;
    calcSpeedOutput.isRunning = false;
    calcSpeedOutput.isSafetyActive = false;
    calcSpeedOutput.runtime = 0;
    calcSpeedOutput.speedHistory = [];

    // Prepare input for DriveCalculateSpeed
    calcSpeedInput.enable = input.enable;
    calcSpeedInput.targetSpeed = input.setSpeed;

    this.motorA.exec(calcSpeedInput, calcSpeedOutput);
    this.motorB.exec(calcSpeedInput, calcSpeedOutput);
    calculatedSpeed = calcSpeedOutput.actualSpeed;
    output.actualSpeed = calculatedSpeed;
    output.driveStatus = tempDriveStatus;
    return tempResult;
  }
}

/**
 * Example function demonstrating various comparison operations in SCL
 */
@SCLFn()
export class ComparisonTest {
  public static exec(
    // Integer inputs
    @Input({}) intValue1: INT,
    @Input({}) intValue2: INT,

    // Real number inputs
    @Input({}) realValue1: REAL,
    @Input({}) realValue2: REAL,

    // Time inputs
    @Input({}) timeValue1: TIME,
    @Input({}) timeValue2: TIME,

    // String inputs
    @Input({}) strValue1: STRING,
    @Input({}) strValue2: STRING,

    // Output flags for different comparisons
    @Output({}) intEqual: BOOL,
    @Output({}) intNotEqual: BOOL,
    @Output({}) intGreater: BOOL,
    @Output({}) intLessEqual: BOOL,

    @Output({}) realEqual: BOOL,
    @Output({}) realGreater: BOOL,
    @Output({}) realLessEqual: BOOL,

    @Output({}) timeGreater: BOOL,
    @Output({}) timeLessEqual: BOOL,

    @Output({}) strEqual: BOOL,
    @Output({}) strNotEqual: BOOL
  ): BOOL {
    // Declare local variables (these will be generated as temp variables)
    let tempInt1: INT = 0;
    let tempInt2: INT = 0;
    let tempReal1: REAL = 0.0;
    let tempReal2: REAL = 0.0;
    let tempTime1: TIME = '0ms';
    let tempTime2: TIME = '0ms';
    let tempStr1: STRING = '';
    let tempStr2: STRING = '';
    let result: BOOL = false;

    // Store input values in temp variables
    tempInt1 = intValue1;
    tempInt2 = intValue2;
    tempReal1 = realValue1;
    tempReal2 = realValue2;
    tempTime1 = timeValue1;
    tempTime2 = timeValue2;
    tempStr1 = strValue1;
    tempStr2 = strValue2;



    // Integer comparisons
    intEqual = tempInt1 === tempInt2;        // Equal
    intNotEqual = tempInt1 !== tempInt2;     // Not equal
    intGreater = tempInt1 > tempInt2;        // Greater than
    intLessEqual = tempInt1 <= tempInt2;     // Less than or equal

    // Real number comparisons same data type required
    realEqual = tempReal1 === tempReal2;     // Equal
    realGreater = tempReal1 > tempReal2;     // Greater than
    realLessEqual = tempReal1 <= tempReal2;  // Less than or equal

    // Time comparisons same time type required
    timeGreater = tempTime1 > tempTime2;     // Greater than
    timeLessEqual = tempTime1 <= tempTime2;  // Less than or equal

    // String comparisons
    strEqual = tempStr1 === tempStr2;        // Equal
    strNotEqual = tempStr1 !== tempStr2;     // Not equal

    // Complex condition combining multiple comparisons
    result = (
      (tempInt1 > 0 && tempReal1 >= 0.0) ||
      (tempTime1 > '1s' && tempStr1 === 'OK')
    );

    return result;
  }
}


