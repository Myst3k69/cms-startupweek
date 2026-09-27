import { buildCourse, type BuiltCourse } from "../authoring";
import { MVP_IA_META } from "./course";
import { M00 } from "./m00";
import { M01 } from "./m01";
import { M02 } from "./m02";
import { M03 } from "./m03";
import { M04 } from "./m04";
import { M05 } from "./m05";
import { M06 } from "./m06";
import { M07 } from "./m07";
import { M08 } from "./m08";
import { M09 } from "./m09";

export { MVP_IA_COURSE_ID } from "./course";

export const MVP_IA_MODULES = [M00, M01, M02, M03, M04, M05, M06, M07, M08, M09];

/** Formation complète « Construire son MVP avec l'IA » (ids déterministes). */
export function mvpIaCourse(): BuiltCourse {
  return buildCourse(MVP_IA_META, MVP_IA_MODULES);
}
