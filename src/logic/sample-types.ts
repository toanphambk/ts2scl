import { SCLType, SCLArray } from "../ts2scl/core/types/decorators";
import { BOOL, INT, TIME, STRING, dim, REAL } from "../ts2scl/core/types/types";

@SCLType()
export class AlarmConfig_001 {
  ENABLED: BOOL;
  PRIORITY: INT;
  DELAY_TIME: TIME;
  MESSAGE: STRING;
  ACKNOWLEDGEMENT_REQUIRED: BOOL;
  ALARM_CLASS: INT;
  ALARM_GROUP: INT;
}

@SCLType()
export class Config_001 {
  DINT_VAL: INT;

  @SCLArray([dim(0, 10)])
  INT_ARRAY: INT[];

  @SCLArray([dim(0, 10)])
  REAL_ARRAY: REAL[];
}

@SCLType()
export class Status_001 {
  STATE_IDLE: BOOL;
  STATE_RUNNING: BOOL;
  STATE_ERROR: BOOL;
}

@SCLType()
export class ProcessData_001 {
  POSITION: INT;
  VELOCITY: REAL;
  IS_MOVING: BOOL;
}

@SCLType()
export class Matrix_001 {
  @SCLArray([dim(0, 3), dim(0, 3)])
  GRID_INT: INT[][];

  @SCLArray([dim(0, 3), dim(0, 3)])
  GRID_REAL: REAL[][];

  @SCLArray([dim(0, 3), dim(0, 3)])
  GRID_BOOL: BOOL[][];

  @SCLArray([dim(0, 3), dim(0, 3), dim(0, 3)])
  CUBE_INT: INT[][][];

  @SCLArray([dim(0, 3), dim(0, 3), dim(0, 3)])
  CUBE_REAL: REAL[][][];

  @SCLArray([dim(0, 3), dim(0, 3), dim(0, 3)])
  CUBE_BOOL: BOOL[][][];
}

@SCLType()
export class TimeTest_001 {
  SIMPLE_SECOND: TIME;
  MILLISECONDS: TIME;
  HOUR_AND_HALF: TIME;
  COMPLEX_TIME: TIME;
  TWO_DAYS: TIME;

  @SCLArray([dim(0, 5)])
  TIME_ARRAY: TIME[];

  @SCLArray([dim(0, 2)])
  EQUIVALENT_TIMES: TIME[];

  @SCLArray([dim(0, 2)])
  COMPLEX_TIME_ARRAY: TIME[];
}

@SCLType()
export class TestAllTypes_001 {
  CONFIG: Config_001;
  STATUS: Status_001;
  PROCESS_DATA: ProcessData_001;
  MATRIX: Matrix_001;
  ALARM_CONFIG: AlarmConfig_001;

  @SCLArray([dim(0, 9)])
  ALARM_HISTORY: Status_001[];

  @SCLArray([dim(0, 3), dim(0, 3)])
  GRID: ProcessData_001[][];
}

@SCLType()
export class MotorConfig_001 {
  SPEED_SETPOINT: REAL;
  ACCELERATION: REAL;
  DECELERATION: REAL;
  MAX_SPEED: REAL;
  MIN_SPEED: REAL;
  RAMP_TIME: TIME;
}

@SCLType()
export class MotorStatus_001 {
  ACTUAL_SPEED: REAL;
  IS_RUNNING: BOOL;
  ERROR_CODE: INT;
  RUNTIME: TIME;
  ENERGY_CONSUMPTION: REAL;
}

@SCLType()
export class Axis3D_001 {
  X: MotorStatus_001;
  Y: MotorStatus_001;
  Z: MotorStatus_001;

  @SCLArray([dim(0, 2)])
  POSITION: REAL[];

  @SCLArray([dim(0, 2)])
  VELOCITY: REAL[];
}

@SCLType()
export class SensorData_001 {
  VALUE: REAL;
  QUALITY: INT;
  LAST_UPDATE: TIME;
  IS_VALID: BOOL;
}

@SCLType()
export class AlarmSystem_001 {
  CONFIG: AlarmConfig_001;

  HISTORY: AlarmConfig_001[];
}

@SCLType()
export class ComplexTest_001 {
  CONFIG: Config_001;
  MOTOR_CONFIG: MotorConfig_001;
  STATUS: Status_001;
  AXIS_STATUS: Axis3D_001;

  @SCLArray([dim(0, 5)])
  MOTOR_HISTORY: MotorStatus_001[];

  @SCLArray([dim(0, 3), dim(0, 3)])
  SENSOR_GRID: SensorData_001[][];

  @SCLArray([dim(0, 2), dim(0, 2), dim(0, 2)])
  TEMPERATURE_CUBE: REAL[][][];

  @SCLArray([dim(0, 23)])
  HOURLY_TIMESTAMPS: TIME[];

  @SCLArray([dim(0, 99)])
  PROCESS_HISTORY: ProcessData_001[];

  ALARM_SYSTEM: AlarmSystem_001;
  MATRIX: Matrix_001;
  TIME_TEST: TimeTest_001;

  @SCLArray([dim(0, 999)])
  PERFORMANCE_DATA: REAL[];

  @SCLArray([dim(0, 9)])
  SENSOR_ARRAY: SensorData_001[];
}


//cronjob
@SCLType()
export class CronJob_001 {
  ID: INT;
  NAME: STRING;
  STATUS: STRING;
  LAST_RUN: TIME;
  NEXT_RUN: TIME;
  INTERVAL: TIME;
  PARAMS: STRING;
  CRON_EXPRESSION: STRING;
}