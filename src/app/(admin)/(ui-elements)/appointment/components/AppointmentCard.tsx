import React from 'react';

export interface Appointment {
	id: string;
	service_id: string;
	user_id: string;
	date: string;
	time: string;
	status: 'confirmed' | 'cancelled';
}

interface AppointmentCardProps {
	appointment: Appointment;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
	return (
		<div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 8 }}>
			<div style={{ fontWeight: 600 }}>Appointment #{appointment.id}</div>
			<div>Date: {appointment.date}</div>
			<div>Time: {appointment.time}</div>
			<div>Status: {appointment.status}</div>
		</div>
	);
};

export default AppointmentCard;


