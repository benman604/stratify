export type LatLng = [number, number];

export type MetaAthlete = {
	id: number;
	resource_state: number;
};

export type PolylineMap = {
	id: string;
	polyline?: string | null;
	summary_polyline?: string | null;
	resource_state?: number;
};

export type PhotosSummary = {
	count: number;
	primary?: {
		id?: number | null;
		source?: number;
		unique_id?: string;
		urls?: Record<string, string>;
	};
};

export type StravaActivity = {
	resource_state: number;
	athlete: MetaAthlete;
	name: string;
	distance: number;
	moving_time: number;
	elapsed_time: number;
	total_elevation_gain: number;
	type?: string;
	sport_type?: string;
	workout_type?: number | null;
	id: number;
	start_date: string;
	start_date_local: string;
	timezone?: string;
	utc_offset?: number;
	location_city?: string | null;
	location_state?: string | null;
	location_country?: string | null;
	achievement_count?: number;
	kudos_count?: number;
	comment_count?: number;
	athlete_count?: number;
	photo_count?: number;
	map: PolylineMap;
	trainer?: boolean;
	commute?: boolean;
	manual?: boolean;
	private?: boolean;
	visibility?: string;
	flagged?: boolean;
	gear_id?: string | null;
	start_latlng?: LatLng | [];
	end_latlng?: LatLng | [];
	average_speed?: number;
	max_speed?: number;
	average_cadence?: number;
	average_watts?: number;
	weighted_average_watts?: number;
	kilojoules?: number;
	device_watts?: boolean;
	has_heartrate?: boolean;
	average_heartrate?: number;
	max_heartrate?: number;
	max_watts?: number;
	pr_count?: number;
	total_photo_count?: number;
	has_kudoed?: boolean;
	suffer_score?: number;
	description?: string | null;
	calories?: number;
	upload_id?: number;
	external_id?: string | null;
	from_accepted_tag?: boolean;
	photos?: PhotosSummary;
	device_name?: string;
	embed_token?: string;
};

export type Route = StravaActivity & {
	title: string;
	startTime: string;
	localStartTime: string;
	formattedStartTime: string;
	timeZone: string | undefined;
	distanceMeters: number;
	durationSeconds: number;
	averagePaceSecondsPerKm: number | null;
	summaryPolyline: string;
};

export function getActivitySportType(activity: Pick<StravaActivity, 'sport_type' | 'type'>) {
	return activity.sport_type ?? activity.type ?? 'Unknown';
}

export function toRoute(activity: StravaActivity): Route | null {
	const summaryPolyline = activity.map?.summary_polyline || activity.map?.polyline;

	if (!summaryPolyline) {
		return null;
	}

	const distanceKm = activity.distance / 1000;
	const durationSeconds = activity.moving_time || activity.elapsed_time;
	const timeZone = getIanaTimeZone(activity.timezone);
	const localStartTime = activity.start_date_local || activity.start_date;
	const utcStartTime = activity.start_date || activity.start_date_local;

	return {
		...activity,
		title: activity.name,
		startTime: activity.start_date,
		localStartTime,
		formattedStartTime: formatActivityStart(utcStartTime, timeZone, activity.utc_offset),
		timeZone,
		distanceMeters: activity.distance,
		durationSeconds,
		averagePaceSecondsPerKm: distanceKm > 0 ? durationSeconds / distanceKm : null,
		summaryPolyline
	};
}

function getIanaTimeZone(timezone: string | undefined) {
	if (!timezone) return undefined;

	const trimmed = timezone.trim();
	const match = trimmed.match(/\)\s*(.+)$/);
	const tz = match?.[1]?.trim();

	if (tz) return tz;
	if (trimmed.includes('/')) return trimmed;

	return undefined;
}

function formatActivityStart(
	value: string,
	timeZone: string | undefined,
	utcOffsetSeconds?: number
) {
	const options: Intl.DateTimeFormatOptions = {
		dateStyle: 'medium',
		timeStyle: 'short'
	};

	const date = new Date(value);

	if (timeZone && isValidTimeZone(timeZone)) {
		options.timeZone = timeZone;
		return new Intl.DateTimeFormat(undefined, options).format(date);
	}

	if (typeof utcOffsetSeconds === 'number' && Number.isFinite(utcOffsetSeconds)) {
		const offsetDate = new Date(date.getTime() + utcOffsetSeconds * 1000);
		options.timeZone = 'UTC';
		return new Intl.DateTimeFormat(undefined, options).format(offsetDate);
	}

	return new Intl.DateTimeFormat(undefined, options).format(date);
}

function isValidTimeZone(timeZone: string) {
	try {
		Intl.DateTimeFormat(undefined, { timeZone });
		return true;
	} catch {
		return false;
	}
}
