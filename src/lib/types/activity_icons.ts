import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import {
	faBicycle,
	faPersonBiking,
	faPersonHiking,
	faPersonRunning,
	faPersonSkating,
	faPersonSkiing,
	faPersonSkiingNordic,
	faPersonSnowboarding,
	faPersonSwimming,
	faPersonWalking,
	faRoute,
	faSailboat,
	faWater,
	faWheelchair
} from '@fortawesome/free-solid-svg-icons';
import { getActivitySportType, type StravaActivity } from '$lib/types/strava';

export const iconBySportType: Record<string, IconDefinition> = {
	AlpineSki: faPersonSkiing,
	BackcountrySki: faPersonSkiing,
	Canoeing: faWater,
	EBikeRide: faPersonBiking,
	EMountainBikeRide: faPersonBiking,
	GravelRide: faPersonBiking,
	Handcycle: faBicycle,
	Hike: faPersonHiking,
	IceSkate: faPersonSkating,
	InlineSkate: faPersonSkating,
	Kayaking: faWater,
	Kitesurf: faWater,
	MountainBikeRide: faPersonBiking,
	NordicSki: faPersonSkiingNordic,
	Ride: faPersonBiking,
	RollerSki: faPersonSkiingNordic,
	Rowing: faWater,
	Run: faPersonRunning,
	Sail: faSailboat,
	Skateboard: faPersonSkating,
	Snowboard: faPersonSnowboarding,
	Snowshoe: faPersonWalking,
	StandUpPaddling: faWater,
	Surfing: faWater,
	Swim: faPersonSwimming,
	TrailRun: faPersonRunning,
	Velomobile: faBicycle,
	VirtualRide: faPersonBiking,
	VirtualRow: faWater,
	VirtualRun: faPersonRunning,
	Walk: faPersonWalking,
	Wheelchair: faWheelchair,
	Windsurf: faWater
};

export function getActivityIcon(activity: Pick<StravaActivity, 'sport_type' | 'type'>) {
	const sportType = getActivitySportType(activity);
	return iconBySportType[sportType] ?? faRoute;
}
