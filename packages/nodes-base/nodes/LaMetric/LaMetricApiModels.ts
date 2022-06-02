export interface Frame { }

export interface SimpleFrame extends Frame {
	icon: string
	text: string
}

export interface GoalData {
	start: number
	current: number
	end: number
	unit: string
}

export interface GoalFrame extends Frame {
	icon: string
	goalData: GoalData
}

export interface ChartFrame extends Frame {
	chartData: number[]
}

export type SoundCategory = 'notifications' | 'alarms'

export interface Sound {
	category: SoundCategory
	id: string
	repeat: number
}

export interface Model {
	frames: Frame[]
	sound?: Sound
	cycles: number
}

export interface NotificationBody {
	priority: 'info' | 'warning' | 'critical'
	icon_type: 'none' | 'info' | 'alert'
	lifeTime: number
	model: Model
}

export interface DisplayBody {
	brightness: number
	brightness_mode: 'auto' | 'manual'
}

export interface AudioBody {
	volume: number
}
