const fs = require('fs');

const filePath = 'src/views/DashboardView.vue';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace import
content = content.replace(
  'getTeacherCourseResourceListApi,',
  `getResourcePageApi,
  getTeacherCourseResourcePageApi,`
);
content = content.replace(
  'getStudentCourseResourceListApi,',
  `getStudentCourseResourcePageApi,`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Imports replaced.');
