/**
 * Field-hockey pitch copied from HockeyPitch on the /ava page
 * (camib0b/camila-s-digital-space, src/components/ava/AvaStage.tsx).
 * Lengths, stroke weights, and the dotted 5m pattern match that drawing.
 * Colour uses carpeta's muted foreground: AVA paints #eceae4 on a fixed
 * #070708 surface, which would vanish on this light page and glare on the dark one.
 */

const METRE = 10
const VIEW_PADDING_X = 28
const VIEW_PADDING_Y = 20
const FIELD_LENGTH = 91.4 * METRE
const FIELD_WIDTH = 55 * METRE
const VIEW_WIDTH = FIELD_LENGTH + VIEW_PADDING_X * 2
const VIEW_HEIGHT = FIELD_WIDTH + VIEW_PADDING_Y * 2

const FIELD_LEFT = VIEW_PADDING_X
const FIELD_TOP = VIEW_PADDING_Y
const FIELD_RIGHT = FIELD_LEFT + FIELD_LENGTH
const FIELD_BOTTOM = FIELD_TOP + FIELD_WIDTH
const FIELD_CENTER_X = (FIELD_LEFT + FIELD_RIGHT) / 2
const FIELD_CENTER_Y = (FIELD_TOP + FIELD_BOTTOM) / 2

const GOAL_WIDTH = 3.66 * METRE
const GOAL_DEPTH = 1.2 * METRE
const GOAL_HALF_WIDTH = GOAL_WIDTH / 2
const SHOOTING_CIRCLE_RADIUS = 14.63 * METRE
const FIVE_METRE_RADIUS = SHOOTING_CIRCLE_RADIUS + 5 * METRE
const PENALTY_SPOT_DISTANCE = 6.4 * METRE
const TWENTY_THREE_METRE = 22.9 * METRE

function shootingCirclePath(goalX: number, intoField: 1 | -1, radius: number): string {
  const postTop = FIELD_CENTER_Y - GOAL_HALF_WIDTH
  const postBottom = FIELD_CENTER_Y + GOAL_HALF_WIDTH
  const backlineTop = postTop - radius
  const backlineBottom = postBottom + radius
  const capX = goalX + intoField * radius
  const sweep = intoField === 1 ? 1 : 0

  return [
    `M ${goalX} ${backlineTop}`,
    `A ${radius} ${radius} 0 0 ${sweep} ${capX} ${postTop}`,
    `L ${capX} ${postBottom}`,
    `A ${radius} ${radius} 0 0 ${sweep} ${goalX} ${backlineBottom}`,
  ].join(' ')
}

export function HockeyPitch() {
  const leftGoalY = FIELD_CENTER_Y - GOAL_HALF_WIDTH
  const rightTwentyThree = FIELD_RIGHT - TWENTY_THREE_METRE

  return (
    <svg
      className="landing-pitch h-full w-full"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        className="landing-pitch-fill"
        x={FIELD_LEFT}
        y={FIELD_TOP}
        width={FIELD_LENGTH}
        height={FIELD_WIDTH}
      />
      <rect
        className="landing-pitch-line is-strong landing-pitch-draw"
        pathLength={1}
        x={FIELD_LEFT}
        y={FIELD_TOP}
        width={FIELD_LENGTH}
        height={FIELD_WIDTH}
      />
      <line
        className="landing-pitch-line is-strong landing-pitch-draw"
        pathLength={1}
        x1={FIELD_CENTER_X}
        y1={FIELD_TOP}
        x2={FIELD_CENTER_X}
        y2={FIELD_BOTTOM}
      />
      <line
        className="landing-pitch-line landing-pitch-draw"
        pathLength={1}
        x1={FIELD_LEFT + TWENTY_THREE_METRE}
        y1={FIELD_TOP}
        x2={FIELD_LEFT + TWENTY_THREE_METRE}
        y2={FIELD_BOTTOM}
      />
      <line
        className="landing-pitch-line landing-pitch-draw"
        pathLength={1}
        x1={rightTwentyThree}
        y1={FIELD_TOP}
        x2={rightTwentyThree}
        y2={FIELD_BOTTOM}
      />
      <path
        className="landing-pitch-line is-strong landing-pitch-draw"
        pathLength={1}
        d={shootingCirclePath(FIELD_LEFT, 1, SHOOTING_CIRCLE_RADIUS)}
      />
      <path
        className="landing-pitch-line is-strong landing-pitch-draw"
        pathLength={1}
        d={shootingCirclePath(FIELD_RIGHT, -1, SHOOTING_CIRCLE_RADIUS)}
      />
      <rect
        className="landing-pitch-line is-strong landing-pitch-draw"
        pathLength={1}
        x={FIELD_LEFT - GOAL_DEPTH}
        y={leftGoalY}
        width={GOAL_DEPTH}
        height={GOAL_WIDTH}
      />
      <rect
        className="landing-pitch-line is-strong landing-pitch-draw"
        pathLength={1}
        x={FIELD_RIGHT}
        y={leftGoalY}
        width={GOAL_DEPTH}
        height={GOAL_WIDTH}
      />
      <g className="landing-pitch-detail">
        <path
          className="landing-pitch-line is-dotted"
          d={shootingCirclePath(FIELD_LEFT, 1, FIVE_METRE_RADIUS)}
        />
        <path
          className="landing-pitch-line is-dotted"
          d={shootingCirclePath(FIELD_RIGHT, -1, FIVE_METRE_RADIUS)}
        />
        <circle className="landing-pitch-mark" cx={FIELD_CENTER_X} cy={FIELD_CENTER_Y} r="2.4" />
        <circle
          className="landing-pitch-mark"
          cx={FIELD_LEFT + PENALTY_SPOT_DISTANCE}
          cy={FIELD_CENTER_Y}
          r="2.2"
        />
        <circle
          className="landing-pitch-mark"
          cx={FIELD_RIGHT - PENALTY_SPOT_DISTANCE}
          cy={FIELD_CENTER_Y}
          r="2.2"
        />
      </g>
    </svg>
  )
}
