import { List, ListItem, Popover } from 'konsta/react';
import { useStore } from '../../../store';

const RATIO_OPTIONS = ['free', '1:1', '4:5', '5:4', '3:4', '4:3', '2:3', '3:2', '16:9', '9:16'] as const;

const RatioPopover = () => {
  const { ratioPopover, setRatioPopover, setRatio } = useStore();

  return (
    <Popover opened={ratioPopover} target={'.ratio-name'} onBackdropClick={() => setRatioPopover(false)}>
      <List nested>
        {RATIO_OPTIONS.map((ratio) => (
          <ListItem
            key={ratio}
            title={ratio}
            link
            chevronIos={false}
            onClick={() => {
              setRatio(ratio);
              setRatioPopover(false);
            }}
          />
        ))}
      </List>
    </Popover>
  );
};

export default RatioPopover;
