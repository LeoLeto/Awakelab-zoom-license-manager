import { License } from '../models/License.model';
import { Assignment } from '../models/Assignment.model';
import { History } from '../models/History.model';

interface OverviewStats {
  totalLicenses: number;
  assignedLicenses: number;
  availableLicenses: number;
  utilizationRate: number;
  expiringThisWeek: number;
  totalTeachers: number;
  pendingRequests: number;
}

interface LicenseMetric {
  licenseName: string;
  totalAssignments: number;
  currentlyAssigned: boolean;
  averageDuration: number;
  lastAssigned?: Date;
}

interface TeacherMetric {
  teacherName: string;
  teacherEmail: string;
  currentAssignments: number;
  totalAssignments: number;
  lastActivity?: Date;
}

interface TrendData {
  date: string;
  assignments: number;
  returns: number;
  utilization: number;
}

class AnalyticsService {
  /**
   * Obtiene estadísticas generales del sistema
   */
  async getOverviewStats(): Promise<OverviewStats> {
    const totalLicenses = await License.countDocuments();
    const assignedLicenses = await Assignment.countDocuments({ estado: 'activo' });
    const availableLicenses = totalLicenses - assignedLicenses;
    const utilizationRate = totalLicenses > 0 ? (assignedLicenses / totalLicenses) * 100 : 0;

    // Contar licencias que expiran en los próximos 7 días
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const expiringThisWeek = await Assignment.countDocuments({
      estado: 'activo',
      fechaFinUso: { $lte: nextWeek, $gte: new Date() }
    });

    // Contar profesores únicos con asignaciones activas
    const activeTeachers = await Assignment.distinct('correocorporativo', { estado: 'activo' });
    const totalTeachers = activeTeachers.length;

    // Contar solicitudes pendientes
    const pendingRequests = await Assignment.countDocuments({ estado: 'pendiente' });

    return {
      totalLicenses,
      assignedLicenses,
      availableLicenses,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      expiringThisWeek,
      totalTeachers,
      pendingRequests
    };
  }

  /**
   * Obtiene métricas por licencia
   */
  async getLicenseMetrics(limit: number = 10): Promise<LicenseMetric[]> {
    const licenses = await License.find().lean() as any[];
    const licenseMetrics: LicenseMetric[] = [];

    for (const license of licenses) {
      const assignments = await Assignment.find({ licenseId: license._id }).sort({ createdAt: -1 }) as any[];
      const currentlyAssigned = assignments.some((a: any) => a.estado === 'activo');

      // Calcular duración promedio (solo asignaciones completadas)
      const completedAssignments = assignments.filter((a: any) => a.estado === 'expirado' || a.estado === 'cancelado');
      let averageDuration = 0;
      if (completedAssignments.length > 0) {
        const totalDuration = completedAssignments.reduce((sum: number, assignment: any) => {
          // Skip assignments without proper dates
          if (!assignment.fechaInicioUso) return sum;
          const start = new Date(assignment.fechaInicioUso).getTime();
          const end = new Date(assignment.fechaFinUso || new Date()).getTime();
          return sum + (end - start);
        }, 0);
        averageDuration = totalDuration / completedAssignments.length / (1000 * 60 * 60 * 24); // Convertir a días
      }

      const lastAssignment = assignments[0];

      licenseMetrics.push({
        licenseName: `${license.email} (${license.name})`,
        totalAssignments: assignments.length,
        currentlyAssigned,
        averageDuration: Math.round(averageDuration * 10) / 10,
        lastAssigned: lastAssignment?.fechaInicioUso
      });
    }

    // Ordenar por total de asignaciones (más populares primero)
    return licenseMetrics.sort((a, b) => b.totalAssignments - a.totalAssignments).slice(0, limit);
  }

  /**
   * Obtiene métricas por profesor
   */
  async getTeacherMetrics(limit: number = 10): Promise<TeacherMetric[]> {
    const allAssignments = await Assignment.find().sort({ createdAt: -1 }).lean() as any[];
    
    // Agrupar por profesor
    const teacherMap = new Map<string, {
      name: string;
      email: string;
      currentAssignments: number;
      totalAssignments: number;
      lastActivity: Date;
    }>();

    for (const assignment of allAssignments) {
      // Skip assignments without required fields
      if (!assignment.correocorporativo || !assignment.nombreApellidos) continue;

      const key = assignment.correocorporativo;
      const existing = teacherMap.get(key);

      if (existing) {
        existing.totalAssignments++;
        if (assignment.estado === 'activo') {
          existing.currentAssignments++;
        }
        if (assignment.createdAt && assignment.createdAt > existing.lastActivity) {
          existing.lastActivity = assignment.createdAt;
        }
      } else {
        teacherMap.set(key, {
          name: assignment.nombreApellidos,
          email: assignment.correocorporativo,
          currentAssignments: assignment.estado === 'activo' ? 1 : 0,
          totalAssignments: 1,
          lastActivity: assignment.createdAt || new Date()
        });
      }
    }

    // Convertir a array
    const metrics: TeacherMetric[] = Array.from(teacherMap.values()).map(t => ({
      teacherName: t.name,
      teacherEmail: t.email,
      currentAssignments: t.currentAssignments,
      totalAssignments: t.totalAssignments,
      lastActivity: t.lastActivity
    }));

    // Ordenar por total de asignaciones
    return metrics.sort((a, b) => b.totalAssignments - a.totalAssignments).slice(0, limit);
  }

  /**
   * Obtiene tendencias de los últimos N días
   */
  async getTrends(days: number = 30): Promise<TrendData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const assignments = await Assignment.find({
      createdAt: { $gte: startDate }
    }).lean() as any[];

    const totalLicenses = await License.countDocuments();

    // Agrupar por día
    const trendMap = new Map<string, { assignments: number; returns: number }>();

    for (const assignment of assignments) {
      // Skip assignments without fechaInicioUso
      if (!assignment.fechaInicioUso) continue;

      const dateKey = new Date(assignment.fechaInicioUso).toISOString().split('T')[0];
      const existing = trendMap.get(dateKey) || { assignments: 0, returns: 0 };
      existing.assignments++;
      trendMap.set(dateKey, existing);

      if ((assignment.estado === 'expirado' || assignment.estado === 'cancelado') && assignment.fechaFinUso) {
        const returnDateKey = new Date(assignment.fechaFinUso).toISOString().split('T')[0];
        const returnExisting = trendMap.get(returnDateKey) || { assignments: 0, returns: 0 };
        returnExisting.returns++;
        trendMap.set(returnDateKey, returnExisting);
      }
    }

    // Crear array con todos los días
    const trends: TrendData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const data = trendMap.get(dateKey) || { assignments: 0, returns: 0 };

      // Calcular utilización promedio para ese día
      const activeOnDate = await Assignment.countDocuments({
        estado: 'activo',
        fechaInicioUso: { $lte: date },
        fechaFinUso: { $gte: date }
      });
      const utilization = totalLicenses > 0 ? (activeOnDate / totalLicenses) * 100 : 0;

      trends.push({
        date: dateKey,
        assignments: data.assignments,
        returns: data.returns,
        utilization: Math.round(utilization * 10) / 10
      });
    }

    return trends;
  }

  /**
   * Obtiene métricas de actividad histórica
   */
  async getHistoryMetrics(): Promise<{
    totalEvents: number;
    eventsByType: { type: string; count: number }[];
    recentActivity: any[];
  }> {
    const totalEvents = await History.countDocuments();

    // Agrupar por tipo de evento
    const eventsByTypeRaw = await History.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const eventsByType = eventsByTypeRaw.map((e: any) => ({
      type: e._id,
      count: e.count
    }));

    // Actividad reciente (últimos 10 eventos)
    const recentActivity = await History.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return {
      totalEvents,
      eventsByType,
      recentActivity
    };
  }
}

export default new AnalyticsService();
