import { PermissionAction, PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

const studentPermissionActions = [
  PermissionAction.VIEW_TASKS,
  PermissionAction.SUBMIT_WORK,
];
const teacherPermissionActions = [
  PermissionAction.VIEW_TASKS,
  PermissionAction.CREATE_TASK,
  PermissionAction.REVIEW_SUBMISSION,
];
const adminPermissionActions = [
  PermissionAction.VIEW_TASKS,
  PermissionAction.CREATE_TASK,
  PermissionAction.REVIEW_SUBMISSION,
  PermissionAction.MANAGE_USERS,
];
// Создала пока временно пользователей по своей логике для удобного тестирования мною:
// Есть два преподавателя, два студента, администратор.
// Дала им роли, в которых базовые права есть, группы у студентов
async function main() {
  await Promise.all(
    Object.values(PermissionAction).map((action) =>
      prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      }),
    ),
  );

  const studentRole = await prisma.role.upsert({
    where: { name: RoleName.STUDENT },
    update: {
      permissions: {
        set: studentPermissionActions.map((action) => ({ action })),
      },
    },
    create: {
      name: RoleName.STUDENT,
      permissions: {
        connect: studentPermissionActions.map((action) => ({ action })),
      },
    },
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: RoleName.TEACHER },
    update: {
      permissions: {
        set: teacherPermissionActions.map((action) => ({ action })),
      },
    },
    create: {
      name: RoleName.TEACHER,
      permissions: {
        connect: teacherPermissionActions.map((action) => ({ action })),
      },
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {
      permissions: {
        set: adminPermissionActions.map((action) => ({ action })),
      },
    },
    create: {
      name: RoleName.ADMIN,
      permissions: {
        connect: adminPermissionActions.map((action) => ({ action })),
      },
    },
  });

  const group101 = await prisma.group.upsert({
    where: { name: 'PI-101' },
    update: {},
    create: { name: 'PI-101' },
  });

  const group102 = await prisma.group.upsert({
    where: { name: 'PI-102' },
    update: {},
    create: { name: 'PI-102' },
  });

  const ivanov = await prisma.user.upsert({
    where: { username: 'ivanov' },
    update: {},
    create: {
      username: 'ivanov',
      password: 'password123',
      fullName: 'Ivan Ivanov',
      roles: { connect: { id: teacherRole.id } },
    },
  });

  const petrova = await prisma.user.upsert({
    where: { username: 'petrova' },
    update: {},
    create: {
      username: 'petrova',
      password: 'password123',
      fullName: 'Anna Petrova',
      roles: { connect: { id: teacherRole.id } },
    },
  });

  const smirnov = await prisma.user.upsert({
    where: { username: 'smirnov' },
    update: {},
    create: {
      username: 'smirnov',
      password: 'student123',
      fullName: 'Alexey Smirnov',
      roles: { connect: { id: studentRole.id } },
      group: { connect: { id: group101.id } },
    },
  });

  await prisma.user.upsert({
    where: { username: 'kuznetsova' },
    update: {},
    create: {
      username: 'kuznetsova',
      password: 'student123',
      fullName: 'Elena Kuznetsova',
      roles: { connect: { id: studentRole.id } },
      group: { connect: { id: group101.id } },
    },
  });

  const sokolov = await prisma.user.upsert({
    where: { username: 'sokolov' },
    update: {},
    create: {
      username: 'sokolov',
      password: 'student123',
      fullName: 'Maxim Sokolov',
      roles: { connect: { id: studentRole.id } },
      group: { connect: { id: group102.id } },
    },
  });

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'admin123',
      fullName: 'System Admin',
      roles: { connect: { id: adminRole.id } },
    },
  });

  const restApiTask = await prisma.task.upsert({
    where: {
      title_groupId: { title: 'REST API basics', groupId: group101.id },
    },
    update: {},
    create: {
      title: 'REST API basics',
      description: 'Implement CRUD endpoints for student submissions.',
      dueDate: new Date('2025-12-15T23:59:00Z'),
      createdById: ivanov.id,
      groupId: group101.id,
    },
  });

  const clientTask = await prisma.task.upsert({
    where: {
      title_groupId: { title: 'Client project setup', groupId: group102.id },
    },
    update: {},
    create: {
      title: 'Client project setup',
      description: 'Prepare project structure and push initial client draft.',
      dueDate: new Date('2025-12-18T23:59:00Z'),
      createdById: petrova.id,
      groupId: group102.id,
    },
  });

  await prisma.submission.upsert({
    where: {
      taskId_studentId: { taskId: restApiTask.id, studentId: smirnov.id },
    },
    update: {
      content: 'Submitted REST API implementation',
      fileUrl: 'https://example.com/submissions/smirnov-rest-api.zip',
    },
    create: {
      taskId: restApiTask.id,
      studentId: smirnov.id,
      content: 'Submitted REST API implementation',
      fileUrl: 'https://example.com/submissions/smirnov-rest-api.zip',
      submittedAt: new Date('2025-12-05T10:00:00Z'),
    },
  });

  await prisma.submission.upsert({
    where: {
      taskId_studentId: { taskId: clientTask.id, studentId: sokolov.id },
    },
    update: {
      content: 'Initial client project scaffold',
      fileUrl: 'https://example.com/submissions/sokolov-client.zip',
    },
    create: {
      taskId: clientTask.id,
      studentId: sokolov.id,
      content: 'Initial client project scaffold',
      fileUrl: 'https://example.com/submissions/sokolov-client.zip',
      submittedAt: new Date('2025-12-07T12:30:00Z'),
    },
  });

  console.log('Заполнение базы данных завершено.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
