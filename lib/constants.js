/**
 * Central application constants.
 * Single source of truth so the system stays consistent across web + mobile.
 */

export const APP_NAME = "Faculty Evaluation";
export const APP_DESCRIPTION =
  "A secure and anonymous way for students to rate their instructors.";

/** The only account allowed to access the Admin Panel */
export const ADMIN_EMAIL = "admintest@gmail.com";

/** Academic year levels offered by the institution */
export const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

/** Block / section identifiers */
export const BLOCKS = ["Blk A", "Blk B", "Blk C", "Blk D", "Blk E", "Blk F", "Blk G"];

/** Semester options */
export const SEMESTERS = ["1st Semester", "2nd Semester"];

/** Settings row id used for the evaluation gateway config */
export const SETTINGS_ID = "formConfig";

/** Password requirements */
export const PASSWORD_MIN_LENGTH = 6;

/** Safe, unambiguous password charset for temporary passwords (no 0/O, 1/I/L) */
export const TEMP_PASSWORD_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Navigation definition for the admin sidebar */
export const ADMIN_NAV = [
  { label: "Dashboard", path: "/AdminDashboard", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { label: "Faculty", path: "/AdminDashboard/Faculty", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { label: "Students", path: "/AdminDashboard/StudentList", icon: "M12 14l9-5-9-5-9 5 9 5zM3 9v5m18-5v5M7 12v4c0 1.5 2.2 2.5 5 2.5s5-1 5-2.5v-4" },
  { label: "Subjects", path: "/AdminDashboard/Subjects", icon: "M12 6.253v13m7-13v13m-7-13a7 4 0 100-8 7 4 0 100 8zM5 6.253v13" },
  { label: "Results", path: "/AdminDashboard/Results", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Activity Logs", path: "/AdminDashboard/Logs", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

/** Timezone used across the app for formatting */
export const APP_TIMEZONE = "en-PH";
