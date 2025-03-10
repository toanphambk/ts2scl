
import { SCLDb, Retain, SCLArray, Temp } from '../ts2scl/core/types/decorators.js';
import { INT, TIME, dim, BOOL, STRING, REAL } from '../ts2scl/core/types/types.js';
import { TestAllTypes_001, Config_001, Status_001, ProcessData_001 } from './sample-types.js';

@SCLDb({
  version: '1.0',
  optimizedAccess: true,
  dbAccessibleFromOPCUA: true,
  dbAccessibleFromWebserver: true,
})
export class MainDB {
  @Retain()
  public ALL_TYPES: TestAllTypes_001;

  @Retain()
  public CYCLE_COUNT: INT;

  public LAST_CYCLE_TIME: TIME;

  @Retain()
  @SCLArray([dim(0, 9)])
  public PROCESS_HISTORY: ProcessData_001[];

  @SCLArray([dim(0, 2), dim(0, 3)])
  public PROCESS_MATRIX: ProcessData_001[][];
}

@SCLDb({
  version: '1.0',
  optimizedAccess: false,
  dbAccessibleFromOPCUA: true,
  readOnly: true,
})
export class SettingsDB {
  @Retain()
  public CONFIG: Config_001
  @Retain()
  public MAINTENANCE_MODE: BOOL

  @Retain()
  public MAINTENANCE_TIMEOUT: TIME

  constructor() {
    this.MAINTENANCE_MODE = false;
    this.MAINTENANCE_TIMEOUT = 'T#1h';
    this.CONFIG.DINT_VAL = 42;
    this.CONFIG.INT_ARRAY[0] = 1;
    this.CONFIG.INT_ARRAY[1] = 2;
    this.CONFIG.INT_ARRAY[2] = 3;
    this.CONFIG.REAL_ARRAY[0] = 1.1;
    this.CONFIG.REAL_ARRAY[1] = 2.2;
    this.CONFIG.REAL_ARRAY[2] = 3.3;
  }
}

@SCLDb({
  version: '1.0',
  optimizedAccess: true,
  unlinked: true,
  nonRetain: true,
})
export class StatusDB {
  public CURRENT_STATUS: Status_001;

  @SCLArray([dim(0, 99)])
  public STATUS_HISTORY: Status_001[];

  public LAST_ERROR_MESSAGE: STRING;
}

//create db for pram for a motor , with sepeed and acceleration is retain and temperature is temp

@SCLDb({
  version: '1.0',
  optimizedAccess: true,
  dbAccessibleFromOPCUA: true,
  dbAccessibleFromWebserver: true,
})
export class MotorDB {
  @Retain()
  public SPEED: INT;

  @Retain()
  public ACCELERATION: INT;

  @Temp()
  public TEMPERATURE: REAL;
}




