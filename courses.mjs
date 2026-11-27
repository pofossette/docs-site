export const COURSES = {
  compiler: {
    id: 'compiler',
    base: '/compiler',
    title: '编译原理交互实验室',
    description: '集成 Cytoscape.js 动态有向图、语法树与状态机推演的编译原理交互式学习笔记。',
  },
  'se-req': {
    id: 'se-req',
    base: '/se-req',
    title: '软件需求分析交互笔记',
    description: '软件需求工程与建模全景交互式学习指南与 15 讲通关路线图。',
  },
};

export const DEFAULT_COURSE_ID = 'compiler';

export function getActiveCourse() {
  const id = process.env.COURSE_ID || DEFAULT_COURSE_ID;
  const course = COURSES[id];
  if (!course) {
    throw new Error(
      `Unknown COURSE_ID="${id}". Available courses: ${Object.keys(COURSES).join(', ')}`,
    );
  }
  return course;
}
