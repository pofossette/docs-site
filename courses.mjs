export const COURSES = {
  compiler: {
    id: 'compiler',
    base: '/compiler',
    title: '编译原理交互实验室',
    description: '集成 Cytoscape.js 动态有向图、语法树与状态机推演的编译原理交互式学习笔记。',
    chapterSlugs: [
      '01-intro',
      '02-pipeline',
      '03-lexical',
      '04-grammar-intro',
      '05-top-down',
      '06-bottom-up',
      '07-semantics',
      '08-control-flow',
      '09-runtime',
      '10-dataflow',
      '11-optimization',
      '12-codegen',
      '13-quiz-master',
      'algorithms-reference',
    ],
  },
  'se-req': {
    id: 'se-req',
    base: '/se-req',
    title: '软件需求分析交互笔记',
    description: '软件需求工程与建模全景交互式学习指南与 15 讲通关路线图。',
    chapterSlugs: [
      '01-intro',
      '02-user-view',
      '03-process-framework',
      '04-elicitation',
      '05-analysis-boundary',
      '06-modeling',
      '07-srs-spec',
      '08-quality-attributes',
      '09-prototyping',
      '10-prioritization',
      '11-verification',
      '12-management-practice',
      '13-change-management',
      '14-traceability',
      '15-summary',
    ],
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
