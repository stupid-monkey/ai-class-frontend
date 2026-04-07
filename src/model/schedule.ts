export interface submitSchedule {
  taskId: string
}

export interface scheduleResult {
  taskId: string,
  status: string
  timetable?:[{
     id: number,
     taskId: string,
     classId: string
     dayOfWeek: number,
     periodNum: number,
     timeType: string,
     courseName: string,                                        
     teacherName: string
  }]
}

export interface ScheduleEvaluation {
    evaluations: [
      {
        score: number,
        classId: string,
        summaryComment: string,
        deductionItems: [
          {
            reason: string,
            deduction: number,
            dimension: string
          },       
        ]
      }]
    }
export interface semesterResult {
    classId: string,
    totalDays: number,
        actualTimetable: [
            {
                id: number,
                taskId: string,
                semesterId: string,
                calendarDate: string,
                classId: string,
                className: string,
                periodNum: number,
                courseId: string,
                courseName: string,
                teacherId: string,
                teacherName: string,
                status: string
            },
          ],
        taskId: string
      }
