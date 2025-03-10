
import { SCLType, SCLArray, SCLFB, Static, Retain, Input, Output } from '../ts2scl/core/types/decorators.js';
import { INT, BOOL, dim, WORD } from '../ts2scl/core/types/types.js';
import { DriveCalcSpeedInput, DriveCalcSpeedOutput, DriveControl, DriveControlInput, DriveControlOutput } from './sample-fc.js';

/**
 * Enhanced DriveController Function Block
 * A complex drive controller that manages motor speed, status, and safety features
 * Demonstrates various access modifiers, RETAIN variables, and function calls
 */


/**
 * Input parameters type for DriveController
 */
@SCLType()
export class DriveControllerInput {
    parameters: INT;
    enable: BOOL;
    targetSpeed: INT;
    safetyEnabled: BOOL;
    @SCLArray([dim(0, 9)])
    speedLimits: INT[];
}

/**
 * Output parameters type for DriveController
 */
@SCLType()
export class DriveControllerOutput {
    status: WORD;
    errorStatus: WORD;
    actualSpeed: INT;
    isRunning: BOOL;
    isSafetyActive: BOOL;
    runtime: INT;
    @SCLArray([dim(0, 9)])
    speedHistory: INT[];
}
@SCLFB()
export class DriveController {
    // arrays for tracking history
    @Static() @SCLArray([dim(0, 4)])
    public statusHistory: WORD[];

    @Static() @SCLArray([dim(0, 4)])
    public speedBuffer: INT[];

    // public variable - not externally accessible
    @Static()
    public statusWord: WORD;

    // Protected variable with RETAIN - externally visible but not writable
    @Static() @Retain()
    public lastSpeed: INT;

    // Public variable - fully accessible
    @Static()
    public currentMode: INT;

    // Readonly variable with RETAIN - visible but not writable
    @Static() @Retain()
    public maxSpeed: INT;

    // Additional variables for enhanced functionality
    @Static() @Retain()
    public errorCount: INT;

    @Static() @Retain()
    public totalRuntime: INT;

    @Static()
    public safetyStatus: WORD;

    public exec(
        @Input({}) input: DriveControllerInput,
        @Output({}) output: DriveControllerOutput
    ): void {
        let tempStatus: WORD = 0x0000;
        let tempSpeed: INT = 0;
        let tempMode: INT = 0;
        let calculatedSpeed: INT = 0;
        let driveStatus: WORD = 0x0000;
        let isSpeedValid: BOOL = false;
        let actualDriveSpeed: INT = 0;
        let arrayIndex: INT = 0;
        let calcSpeedInput: DriveCalcSpeedInput = {} as DriveCalcSpeedInput;
        let calcSpeedOutput: DriveCalcSpeedOutput = {} as DriveCalcSpeedOutput;
        let driveCtrlInput: DriveControlInput = {} as DriveControlInput;
        let driveCtrlOutput: DriveControlOutput = {} as DriveControlOutput;
        calcSpeedInput.enable = false;
        calcSpeedInput.targetSpeed = 0;
        calcSpeedInput.status = 0x0000;

        let errorCounter: INT = 0;
        let validationStatus: BOOL = false;

        // Process error count with a while loop
        while (errorCounter < this.errorCount) {
            // Increment the counter
            errorCounter += 1;

            // Update status word based on error counter
            if (errorCounter > 10) {
                tempStatus = 0x8000; // Critical error status
                break;
            } else {
                tempStatus = 0x4000; // Warning status
            }
        }

        // Demonstrate for loop with break statement
        for (let i = 15; i >= 1; i -= 2) {
            if (i < 5) {
                break; // This should translate to EXIT in SCL
            }
            // Some example operation
            if (i < input.speedLimits.length) {
                output.speedHistory[i] = 1;
            }
        }

        do {
            // Update status history
            for (let i: INT = 3; i >= 0; i--) {
                this.statusHistory[i + 1] = this.statusHistory[i];
            }
            this.statusHistory[0] = this.statusWord;
        } while (false);


        // Update status history
        for (let i: INT = 3; i >= 0; i--) {
            this.statusHistory[i + 1] = this.statusHistory[i];
        }
        this.statusHistory[0] = this.statusWord;

        // Process speed history with complex loop and nested conditions
        for (let i: INT = 0; i < input.speedLimits.length; i += 2) {
            if (input.speedLimits[i] > 0) {
                // Check if this is a valid speed entry
                if (i < 5) {
                    // Process lower range speeds
                    output.speedHistory[i] = input.speedLimits[i];

                    // Apply safety factor for even indices
                    if (i % 2 === 0 && input.safetyEnabled) {
                        // Use integer division instead of Math.floor
                        output.speedHistory[i] = (output.speedHistory[i] * 8) / 10;
                    }
                } else {
                    // Process upper range speeds
                    for (let j: INT = 0; j <= 3; j++) {
                        if (i + j < input.speedLimits.length) {
                            output.speedHistory[i] = input.speedLimits[i + j];
                            break;
                        }
                    }
                }
            } else {
                // Reset invalid speed entries
                output.speedHistory[i] = 0;
            }
        }

        // Check speed limits from array
        if (input.speedLimits[0] > 0 && calculatedSpeed > input.speedLimits[0]) {
            calculatedSpeed = input.speedLimits[0];
        }

        // Safety check
        if (input.safetyEnabled) {
            this.safetyStatus = 0x0001;
            output.isSafetyActive = true;
        } else {
            this.safetyStatus = 0x0000;
            output.isSafetyActive = false;
        }

        if (!input.enable) {
            output.actualSpeed = 0;
            output.isRunning = false;
            output.status = this.statusWord;
            output.errorStatus = 0x0000;
            return;
        }

        // Prepare DriveCalculateSpeed input
        calcSpeedInput.enable = input.enable;
        calcSpeedInput.targetSpeed = input.targetSpeed;
        calcSpeedInput.status = this.statusWord;



        // Update speed buffer
        this.speedBuffer[arrayIndex] = calculatedSpeed;
        arrayIndex = (arrayIndex + 1) % 5;

        // Prepare DriveControl input
        driveCtrlInput.enable = calcSpeedOutput.isRunning;
        driveCtrlInput.setSpeed = calculatedSpeed;

        // Use DriveControl function to manage drive status
        tempMode = DriveControl.exec(
            driveCtrlInput,
            driveCtrlOutput
        );

        // Process drive status and update outputs
        if (calcSpeedOutput.isRunning && calculatedSpeed > 0 && calculatedSpeed <= this.maxSpeed) {
            tempStatus = 0x0001; // Running status
            tempSpeed = calculatedSpeed;
            tempMode = 1;
            output.actualSpeed = driveCtrlOutput.actualSpeed;
            output.isRunning = true;
            this.lastSpeed = tempSpeed;
            this.currentMode = tempMode;
            this.statusWord = tempStatus;
            this.totalRuntime = this.totalRuntime + 1;

            // Update speed history
            output.speedHistory[0] = driveCtrlOutput.actualSpeed;
        } else {
            tempStatus = 0x0002; // Stopped status
            tempSpeed = 0;
            tempMode = 0;
            output.actualSpeed = 0;
            output.isRunning = false;
            this.currentMode = tempMode;
            this.statusWord = tempStatus;
            this.errorCount = this.errorCount + 1;
        }

        // Update outputs
        output.status = this.statusWord;
        output.errorStatus = this.errorCount;
        output.runtime = this.totalRuntime;
    }
}



